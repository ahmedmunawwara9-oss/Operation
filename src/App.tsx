import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Trip,
  AppSettings,
  DataSourceType,
  OperationalAlert,
  ColumnMapping,
} from './types';
import {
  saveTripsToStorage,
  loadTripsFromStorage,
  loadBestLocalSnapshot,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  clearSavedData,
  DEFAULT_SETTINGS,
  loadAcknowledgedAlerts,
  saveAcknowledgedAlerts,
  saveArchivedTodayToStorage,
  loadArchivedTodayFromStorage,
  saveRestoredTripIdsToStorage,
  loadRestoredTripIdsFromStorage,
  markExplicitClearInStorage,
  getExplicitClearMsFromStorage,
} from './services/storageService';
import {
  computeAllTripsRuntime,
  calculateFleetKPIs,
} from './services/scheduleEngine';
import { detectConflictsAndGenerateAlerts } from './services/conflictDetector';
import { mergeTrips, MergeTripsMode, MergeTripsResult } from './services/excelParser';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { KPICards } from './components/KPICards';
import { AnimatedBusMovementCenter } from './components/AnimatedBusMovementCenter';
import { UpcomingDeparturesBoard } from './components/UpcomingDeparturesBoard';
import { BottomPanels } from './components/BottomPanels';
import { DailyTripTimeline } from './components/DailyTripTimeline';
import { OperationalAnalytics } from './components/OperationalAnalytics';
import { AlertCenter } from './components/AlertCenter';
import { ExcelImportModal } from './components/ExcelImportModal';
import { SettingsModal } from './components/SettingsModal';
import { TripDetailModal } from './components/TripDetailModal';
import { generateDemoTrips } from './services/demoData';
import { LoginPage } from './components/LoginPage';
import { UserManagementPanel } from './components/UserManagementPanel';
import { ReportExportButtons } from './components/ReportExportButtons';
import { DelayedTripsDrawer } from './components/DelayedTripsDrawer';
import { SyncConflictModal, SyncConflictData } from './components/SyncConflictModal';
import { formatUnifiedTime, getOperationalDateString } from './services/dateTimeUtils';
import { FileDown } from 'lucide-react';
import {
  AppUser,
  BOOTSTRAPPED_GM_EMAIL,
  fetchOrBootstrapUserProfile,
  logoutUser,
  isAuthTransitionInProgress,
  archiveFinishedTripsAuto,
  saveActiveScheduleToCloud,
  subscribeToActiveSchedule,
  fetchCloudActiveSchedule,
  fetchTodayAutoArchivedTrips,
  auth,
  db,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

function buildTripsSignature(list: Trip[]): string {
  return list
    .map(
      (t) =>
        `${t.id}|${t.tripNumber}|${t.busId}|${t.tripDate}|${t.departureTime}|${t.arrivalTime}|${t.actualStatus || ''}|${t.actualArrivalTime || ''}|${t.delayMinutes || 0}`
    )
    .join(';');
}

function getReconcileTripKey(t: Trip): string {
  const num = String(t.tripNumber || '').trim().toUpperCase();
  return `${num}|${t.tripDate || ''}|${t.departureTime || ''}|${t.busId || ''}`;
}

function analyzeScheduleDiscrepancy(
  localTrips: Trip[],
  cloudTrips: Trip[],
  localMs: number,
  cloudMs: number
): {
  onlyInLocal: number;
  onlyInCloud: number;
  modified: number;
  timeDiffMinutes: number;
  isSignificant: boolean;
} {
  const localMap = new Map<string, Trip>();
  for (const t of localTrips) {
    localMap.set(getReconcileTripKey(t), t);
  }
  const cloudMap = new Map<string, Trip>();
  for (const t of cloudTrips) {
    cloudMap.set(getReconcileTripKey(t), t);
  }

  let onlyInLocal = 0;
  let onlyInCloud = 0;
  let modified = 0;

  for (const [k, lt] of localMap.entries()) {
    const ct = cloudMap.get(k);
    if (!ct) {
      onlyInLocal++;
    } else if (
      (lt.driverName || '') !== (ct.driverName || '') ||
      (lt.arrivalTime || '') !== (ct.arrivalTime || '') ||
      (lt.actualStatus || '') !== (ct.actualStatus || '') ||
      (lt.actualArrivalTime || '') !== (ct.actualArrivalTime || '') ||
      (lt.delayMinutes || 0) !== (ct.delayMinutes || 0)
    ) {
      modified++;
    }
  }

  for (const k of cloudMap.keys()) {
    if (!localMap.has(k)) {
      onlyInCloud++;
    }
  }

  const timeDiffMs = Math.abs(localMs - cloudMs);
  const timeDiffMinutes = Math.round(timeDiffMs / 60000);
  const isSignificant =
    onlyInLocal + onlyInCloud >= 1 ||
    modified >= 2 ||
    (timeDiffMs >= 60000 && (localTrips.length !== cloudTrips.length || modified >= 1));

  return {
    onlyInLocal,
    onlyInCloud,
    modified,
    timeDiffMinutes,
    isSignificant,
  };
}

export default function App() {
  // 1. Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettingsFromStorage();
    return {
      ...loaded,
      companyName: 'درة المنورة لنقل الحجاج والمعتمرين',
      dashboardTitle: 'مكتب التشغيل والعمليات',
    };
  });

  // 2. Trips data: restore from localStorage on page reload / reopen
  const initialStorageRef = useRef<ReturnType<typeof loadTripsFromStorage> | null>(null);
  if (initialStorageRef.current === null) {
    initialStorageRef.current = loadTripsFromStorage();
  }

  const [rawTrips, setRawTrips] = useState<Trip[]>(() => initialStorageRef.current?.trips ?? []);
  const [dataSource, setDataSource] = useState<DataSourceType>(
    () => initialStorageRef.current?.source ?? 'scheduled'
  );
  const lastLocalMutationMsRef = useRef<number>(initialStorageRef.current?.lastMutationMs ?? 0);
  const rawTripsRef = useRef<Trip[]>(rawTrips);
  rawTripsRef.current = rawTrips;
  const dataSourceRef = useRef<DataSourceType>(dataSource);
  dataSourceRef.current = dataSource;

  const [ackAlertIds, setAckAlertIds] = useState<string[]>(() => loadAcknowledgedAlerts());
  const [archivedTodayDate, setArchivedTodayDate] = useState<string>(() =>
    getOperationalDateString(new Date(), loadedSettingsTimeZone())
  );
  const [archivedTodayTrips, setArchivedTodayTrips] = useState<Trip[]>(() =>
    loadArchivedTodayFromStorage(getOperationalDateString(new Date(), loadedSettingsTimeZone()))
  );
  const archivedTodayTripsRef = useRef<Trip[]>(archivedTodayTrips);
  archivedTodayTripsRef.current = archivedTodayTrips;
  const [autoArchiveNotice, setAutoArchiveNotice] = useState<{
    count: number;
    timestamp: number;
  } | null>(null);
  const restoredTripIdsRef = useRef<Set<string>>(new Set(loadRestoredTripIdsFromStorage()));
  const isAutoArchivingRef = useRef<boolean>(false);
  const [syncConflict, setSyncConflict] = useState<SyncConflictData | null>(null);
  const [isApplyingSyncChoice, setIsApplyingSyncChoice] = useState<boolean>(false);
  const syncConflictRef = useRef<SyncConflictData | null>(syncConflict);
  syncConflictRef.current = syncConflict;
  const startupReconcileDoneRef = useRef<boolean>(false);

  function loadedSettingsTimeZone(): string {
    return settings.timeZone || 'Asia/Riyadh';
  }

  // 3. Live Clock (ticks every second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // 0. User Authentication via Firebase Auth & Firestore
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dark / Light mode toggle state persisted in localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dmtc_theme_mode') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    try {
      localStorage.setItem('dmtc_theme_mode', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (isAuthTransitionInProgress()) {
        return;
      }

      if (!fbUser) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await fetchOrBootstrapUserProfile(fbUser);
        if (profile) {
          setCurrentUser(profile);
          setAuthError(null);
        } else {
          setCurrentUser(null);
          setAuthError('هذا الحساب غير مفعل أو تم حذفه من قبل المدير العام.');
        }
      } catch (err) {
        console.error('Auth profile error:', err);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor current user's live Firestore profile for deactivation, deletion, or role changes
  useEffect(() => {
    if (!currentUser?.uid) return;

    const isBootstrappedGM =
      (currentUser.email || '').toLowerCase() === BOOTSTRAPPED_GM_EMAIL.toLowerCase() &&
      auth.currentUser?.emailVerified === true;
    if (isBootstrappedGM) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) {
          return;
        }

        if (!snap.exists()) {
          console.warn('User session terminated: Firestore user profile document does not exist.', {
            uid: currentUser.uid,
          });
          logoutUser();
          clearSavedData();
          restoredTripIdsRef.current.clear();
          setRawTrips([]);
          setArchivedTodayTrips([]);
          setAutoArchiveNotice(null);
          setAckAlertIds([]);
          setCurrentUser(null);
          setActiveTab('dashboard');
          setAuthError('تم تعطيل حسابك أو حذفه، أو تغيّرت صلاحياتك. يرجى تسجيل الدخول مجددًا.');
          return;
        }

        const data = snap.data();
        const isDeactivated = data.isActive === false;
        const isRoleChanged = typeof data.role === 'string' && data.role !== currentUser.role;

        if (isDeactivated || isRoleChanged) {
          console.warn(
            isDeactivated
              ? 'User session terminated: account isActive is false.'
              : 'User session terminated: user role changed in Firestore.',
            {
              uid: currentUser.uid,
              isActive: data.isActive,
              firestoreRole: data.role,
              currentRole: currentUser.role,
            }
          );
          logoutUser();
          clearSavedData();
          restoredTripIdsRef.current.clear();
          setRawTrips([]);
          setArchivedTodayTrips([]);
          setAutoArchiveNotice(null);
          setAckAlertIds([]);
          setCurrentUser(null);
          setActiveTab('dashboard');
          setAuthError('تم تعطيل حسابك أو تغيير صلاحياتك. يرجى تسجيل الدخول مجددًا.');
        }
      },
      (error) => {
        console.warn('User profile listener warning:', error);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.email, currentUser?.role]);

  // 4. Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isDelayedDrawerOpen, setIsDelayedDrawerOpen] = useState<boolean>(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Live Clock loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Conflict Detection and Alert Generation
  const { tripsWithConflicts, alerts: rawAlerts } = useMemo(() => {
    return detectConflictsAndGenerateAlerts(
      rawTrips,
      currentTime,
      settings.departureWarningMinutes
    );
  }, [rawTrips, currentTime, settings.departureWarningMinutes]);

  const alerts: OperationalAlert[] = useMemo(() => {
    return rawAlerts.map((a) => ({
      ...a,
      acknowledged: ackAlertIds.includes(a.id),
    }));
  }, [rawAlerts, ackAlertIds]);

  // Operational date string (00:00 AM to 00:00 midnight)
  const currentOperationalDate = useMemo(
    () => getOperationalDateString(currentTime, settings.timeZone),
    [currentTime, settings.timeZone]
  );

  const persistActiveTrips = useCallback(
    (nextTrips: Trip[], source: DataSourceType, options?: { syncCloud?: boolean }) => {
      const nowMs = Date.now();
      lastLocalMutationMsRef.current = nowMs;
      saveTripsToStorage(nextTrips, source, { mutationMs: nowMs });
      if (options?.syncCloud !== false && currentUser?.uid) {
        void saveActiveScheduleToCloud({
          trips: nextTrips,
          dataSource: source,
          updatedByName: currentUser.displayName,
        });
      }
    },
    [currentUser?.uid, currentUser?.displayName]
  );

  // Startup IndexedDB / localStorage vs Firestore timestamp reconciliation + live sync
  useEffect(() => {
    if (!currentUser?.uid) {
      startupReconcileDoneRef.current = false;
      setSyncConflict(null);
      return;
    }

    let isCancelled = false;
    startupReconcileDoneRef.current = false;

    void fetchTodayAutoArchivedTrips(currentOperationalDate).then((cloudArchived) => {
      if (isCancelled || cloudArchived.length === 0) return;
      setArchivedTodayTrips((prev) => {
        const seen = new Set(
          prev.map((x) => `${x.tripNumber}|${x.tripDate}|${x.departureTime}|${x.busId}`)
        );
        const additions = cloudArchived.filter(
          (x) => !seen.has(`${x.tripNumber}|${x.tripDate}|${x.departureTime}|${x.busId}`)
        );
        if (additions.length === 0) return prev;
        const next = [...prev, ...additions];
        saveArchivedTodayToStorage(currentOperationalDate, next);
        return next;
      });
    });

    const runStartupReconciliation = async () => {
      const [bestLocal, cloudSnapshot] = await Promise.all([
        loadBestLocalSnapshot(),
        fetchCloudActiveSchedule(),
      ]);
      if (isCancelled) return;

      // Hydrate from IndexedDB immediately if IndexedDB holds newer/richer trips than localStorage
      if (
        bestLocal &&
        bestLocal.storageOrigin === 'indexeddb' &&
        (bestLocal.lastMutationMs > lastLocalMutationMsRef.current ||
          (rawTripsRef.current.length === 0 && bestLocal.trips.length > 0))
      ) {
        lastLocalMutationMsRef.current = bestLocal.lastMutationMs || Date.now();
        saveTripsToStorage(bestLocal.trips, bestLocal.source, {
          mutationMs: lastLocalMutationMsRef.current,
        });
        setDataSource(bestLocal.source);
        setRawTrips(bestLocal.trips);
      }

      const explicitClearMs = getExplicitClearMsFromStorage();
      const localTrips = bestLocal?.trips ?? [];
      const localMs = bestLocal?.lastMutationMs ?? 0;
      const localSource = bestLocal?.source ?? dataSourceRef.current;
      const localOrigin = bestLocal?.storageOrigin ?? 'localstorage';

      // Case 1: No cloud document exists yet
      if (!cloudSnapshot) {
        if (localTrips.length > 0) {
          void saveActiveScheduleToCloud({
            trips: localTrips,
            dataSource: localSource,
            updatedByName: currentUser.displayName,
          });
        }
        startupReconcileDoneRef.current = true;
        return;
      }

      // Case 2: No local trips, cloud has trips
      if (localTrips.length === 0 && cloudSnapshot.trips.length > 0) {
        if (
          explicitClearMs > 0 &&
          cloudSnapshot.updatedAtMs > 0 &&
          cloudSnapshot.updatedAtMs > explicitClearMs
        ) {
          const diffStats = analyzeScheduleDiscrepancy(
            [],
            cloudSnapshot.trips,
            explicitClearMs,
            cloudSnapshot.updatedAtMs
          );
          setSyncConflict({
            local: {
              trips: [],
              source: localSource,
              updatedAtMs: explicitClearMs,
              storageOrigin: localOrigin,
            },
            cloud: {
              trips: cloudSnapshot.trips,
              source: cloudSnapshot.dataSource,
              updatedAtMs: cloudSnapshot.updatedAtMs,
              updatedByName: cloudSnapshot.updatedByName,
            },
            recommended: 'cloud',
            diffStats,
          });
          return;
        }

        if (explicitClearMs === 0) {
          lastLocalMutationMsRef.current = cloudSnapshot.updatedAtMs || Date.now();
          saveTripsToStorage(cloudSnapshot.trips, cloudSnapshot.dataSource, {
            mutationMs: lastLocalMutationMsRef.current,
          });
          setDataSource(cloudSnapshot.dataSource);
          setRawTrips(cloudSnapshot.trips);
        }
        startupReconcileDoneRef.current = true;
        return;
      }

      // Case 3: Both local and cloud empty
      if (localTrips.length === 0 && cloudSnapshot.trips.length === 0) {
        startupReconcileDoneRef.current = true;
        return;
      }

      // Case 4: Local has >500 trips and first 500 match cloud cap
      if (
        localTrips.length > 500 &&
        cloudSnapshot.trips.length === 500 &&
        buildTripsSignature(localTrips.slice(0, 500)) === buildTripsSignature(cloudSnapshot.trips)
      ) {
        startupReconcileDoneRef.current = true;
        return;
      }

      // Case 5: Identical content
      if (buildTripsSignature(localTrips) === buildTripsSignature(cloudSnapshot.trips)) {
        startupReconcileDoneRef.current = true;
        return;
      }

      // Case 6: Local has trips, cloud is empty
      if (localTrips.length > 0 && cloudSnapshot.trips.length === 0) {
        const clearedByOtherLater =
          cloudSnapshot.updatedAtMs > localMs + 5000 &&
          cloudSnapshot.updatedBy !== currentUser.uid;
        if (!clearedByOtherLater) {
          void saveActiveScheduleToCloud({
            trips: localTrips,
            dataSource: localSource,
            updatedByName: currentUser.displayName,
          });
          startupReconcileDoneRef.current = true;
          return;
        }
      }

      // Case 7: Compare local vs cloud discrepancy
      const diffStats = analyzeScheduleDiscrepancy(
        localTrips,
        cloudSnapshot.trips,
        localMs,
        cloudSnapshot.updatedAtMs
      );

      if (diffStats.isSignificant) {
        setSyncConflict({
          local: {
            trips: localTrips,
            source: localSource,
            updatedAtMs: localMs,
            storageOrigin: localOrigin,
          },
          cloud: {
            trips: cloudSnapshot.trips,
            source: cloudSnapshot.dataSource,
            updatedAtMs: cloudSnapshot.updatedAtMs,
            updatedByName: cloudSnapshot.updatedByName,
          },
          recommended: localMs >= cloudSnapshot.updatedAtMs ? 'local' : 'cloud',
          diffStats,
        });
        return;
      }

      // Minor difference: resolve automatically using newer timestamp
      if (localMs >= cloudSnapshot.updatedAtMs) {
        void saveActiveScheduleToCloud({
          trips: localTrips,
          dataSource: localSource,
          updatedByName: currentUser.displayName,
        });
      } else {
        lastLocalMutationMsRef.current = cloudSnapshot.updatedAtMs || Date.now();
        saveTripsToStorage(cloudSnapshot.trips, cloudSnapshot.dataSource, {
          mutationMs: lastLocalMutationMsRef.current,
        });
        setDataSource(cloudSnapshot.dataSource);
        setRawTrips(cloudSnapshot.trips);
      }
      startupReconcileDoneRef.current = true;
    };

    void runStartupReconciliation();

    const unsubscribe = subscribeToActiveSchedule(
      (cloudData) => {
        if (isCancelled || !startupReconcileDoneRef.current || syncConflictRef.current) {
          return;
        }
        if (!cloudData) {
          if (rawTripsRef.current.length > 0) {
            void saveActiveScheduleToCloud({
              trips: rawTripsRef.current,
              dataSource: dataSourceRef.current,
              updatedByName: currentUser.displayName,
            });
          }
          return;
        }

        // Ignore cached snapshots while we already have local data
        if (cloudData.fromCache && rawTripsRef.current.length > 0) {
          return;
        }

        const localMs = lastLocalMutationMsRef.current;
        const explicitClearMs = getExplicitClearMsFromStorage();

        // Protect local trips from being wiped by an empty cloud snapshot unless another user cleared after our last edit
        if (cloudData.trips.length === 0 && rawTripsRef.current.length > 0) {
          const clearedRemotelyAfterLocal =
            cloudData.updatedAtMs > localMs + 5000 && cloudData.updatedBy !== currentUser.uid;
          if (!clearedRemotelyAfterLocal && explicitClearMs <= localMs) {
            void saveActiveScheduleToCloud({
              trips: rawTripsRef.current,
              dataSource: dataSourceRef.current,
              updatedByName: currentUser.displayName,
            });
            return;
          }
        }

        // Do not overwrite local list if user explicitly cleared locally after this cloud snapshot
        if (
          rawTripsRef.current.length === 0 &&
          explicitClearMs > 0 &&
          cloudData.updatedAtMs > 0 &&
          explicitClearMs > cloudData.updatedAtMs
        ) {
          return;
        }

        // Preserve full local dataset if > 500 trips (cloud sync caps at 500)
        if (rawTripsRef.current.length > 500 && cloudData.trips.length === 500) {
          return;
        }

        if (localMs > 0 && cloudData.updatedAtMs > 0 && localMs > cloudData.updatedAtMs + 3000) {
          void saveActiveScheduleToCloud({
            trips: rawTripsRef.current,
            dataSource: dataSourceRef.current,
            updatedByName: currentUser.displayName,
          });
          return;
        }

        const incomingSig = buildTripsSignature(cloudData.trips);
        const currentSig = buildTripsSignature(rawTripsRef.current);
        if (incomingSig === currentSig && cloudData.dataSource === dataSourceRef.current) {
          return;
        }

        lastLocalMutationMsRef.current = cloudData.updatedAtMs || Date.now();
        saveTripsToStorage(cloudData.trips, cloudData.dataSource, {
          mutationMs: lastLocalMutationMsRef.current,
        });
        setDataSource(cloudData.dataSource);
        setRawTrips(cloudData.trips);
      },
      (err) => {
        console.warn('Active schedule subscription warning:', err);
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // Flush active trips & today's archived counters to localStorage before page unload/hide
  useEffect(() => {
    const flushToStorage = () => {
      if (rawTripsRef.current.length > 0) {
        saveTripsToStorage(rawTripsRef.current, dataSourceRef.current, {
          mutationMs: lastLocalMutationMsRef.current || Date.now(),
        });
      }
      if (archivedTodayTripsRef.current.length > 0) {
        saveArchivedTodayToStorage(currentOperationalDate, archivedTodayTripsRef.current);
      }
    };

    window.addEventListener('beforeunload', flushToStorage);
    window.addEventListener('pagehide', flushToStorage);
    return () => {
      window.removeEventListener('beforeunload', flushToStorage);
      window.removeEventListener('pagehide', flushToStorage);
    };
  }, [currentOperationalDate]);

  // Reset daily completed-archive KPI counter strictly at 00:00 midnight rollover
  useEffect(() => {
    if (archivedTodayDate !== currentOperationalDate) {
      setArchivedTodayDate(currentOperationalDate);
      setArchivedTodayTrips([]);
      saveArchivedTodayToStorage(currentOperationalDate, []);
    }
  }, [currentOperationalDate, archivedTodayDate]);

  // Compute runtime statuses (progress %, elapsed, remaining)
  const computedTrips = useMemo(() => {
    return computeAllTripsRuntime(tripsWithConflicts, currentTime);
  }, [tripsWithConflicts, currentTime]);

  // Automatically move finished trips to the Archive
  useEffect(() => {
    if (isAutoArchivingRef.current || syncConflict !== null || computedTrips.length === 0) return;

    const finishedTrips = computedTrips.filter(
      (t) =>
        (t.status === 'completed_actual' || t.status === 'completed_scheduled') &&
        !restoredTripIdsRef.current.has(t.id)
    );

    if (finishedTrips.length === 0) return;

    isAutoArchivingRef.current = true;
    const finishedIdSet = new Set(finishedTrips.map((t) => t.id));

    // Remove finished trips from the active live board immediately
    const remaining = rawTripsRef.current.filter((t) => !finishedIdSet.has(t.id));
    setRawTrips(remaining);
    persistActiveTrips(remaining, dataSource);

    // Keep today's finished trips counted in today's KPIs (00:00 - 24:00)
    const finishedToday = finishedTrips.filter(
      (t) => !t.tripDate || t.tripDate === currentOperationalDate
    );
    if (finishedToday.length > 0) {
      setArchivedTodayTrips((prev) => {
        const seen = new Set(
          prev.map((x) => `${x.tripNumber}|${x.tripDate}|${x.departureTime}|${x.busId}`)
        );
        const additions = finishedToday.filter(
          (x) => !seen.has(`${x.tripNumber}|${x.tripDate}|${x.departureTime}|${x.busId}`)
        );
        if (additions.length === 0) return prev;
        const next = [...prev, ...additions];
        saveArchivedTodayToStorage(currentOperationalDate, next);
        return next;
      });
    }

    // Group finished trips by their operational tripDate and persist to Archive
    const byDate = new Map<string, Trip[]>();
    for (const trip of finishedTrips) {
      const dateKey = trip.tripDate || currentOperationalDate;
      const list = byDate.get(dateKey) || [];
      list.push(trip);
      byDate.set(dateKey, list);
    }

    const creatorName = currentUser?.displayName || 'النظام الآلي';
    Promise.all(
      Array.from(byDate.entries()).map(([scheduleDate, dateTrips]) =>
        archiveFinishedTripsAuto({
          scheduleDate,
          trips: dateTrips,
          createdByName: creatorName,
        })
      )
    )
      .then(() => {
        setAutoArchiveNotice({
          count: finishedTrips.length,
          timestamp: Date.now(),
        });
      })
      .catch((err) => {
        console.warn('Auto-archive batch error:', err);
      })
      .finally(() => {
        isAutoArchivingRef.current = false;
      });
  }, [computedTrips, currentOperationalDate, currentUser?.displayName, dataSource, syncConflict]);

  // Calculate fleet KPIs (active trips + today's auto-archived completed trips)
  const kpis = useMemo(() => {
    return calculateFleetKPIs(computedTrips, archivedTodayTrips);
  }, [computedTrips, archivedTodayTrips]);

  // Action Handlers
  const handleConfirmImport = useCallback(
    (
      newTrips: Trip[],
      _mappingUsed: ColumnMapping,
      mode: MergeTripsMode = 'skip'
    ): MergeTripsResult => {
      newTrips.forEach((t) => restoredTripIdsRef.current.delete(t.id));
      saveRestoredTripIdsToStorage(Array.from(restoredTripIdsRef.current));
      const summaryResult = mergeTrips(rawTripsRef.current, newTrips, mode);
      setRawTrips(summaryResult.merged);
      setDataSource('scheduled');
      persistActiveTrips(summaryResult.merged, 'scheduled');
      return summaryResult;
    },
    [persistActiveTrips]
  );

  const handleLoadDemoData = useCallback(() => {
    restoredTripIdsRef.current.clear();
    saveRestoredTripIdsToStorage([]);
    const demo = generateDemoTrips();
    setRawTrips(demo);
    setDataSource('demo');
    persistActiveTrips(demo, 'demo');
  }, [persistActiveTrips]);

  const handleClearAllData = useCallback(() => {
    clearSavedData();
    markExplicitClearInStorage();
    restoredTripIdsRef.current.clear();
    setRawTrips([]);
    setArchivedTodayTrips([]);
    setAutoArchiveNotice(null);
    setAckAlertIds([]);
    persistActiveTrips([], 'scheduled');
  }, [persistActiveTrips]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAckAlertIds((prev) => {
      const next = [...prev, alertId];
      saveAcknowledgedAlerts(next);
      return next;
    });
  }, []);

  const handleAcknowledgeAll = useCallback(() => {
    const allIds = rawAlerts.map((a) => a.id);
    setAckAlertIds(allIds);
    saveAcknowledgedAlerts(allIds);
  }, [rawAlerts]);

  const handleConfirmActualArrival = useCallback((tripId: string) => {
    restoredTripIdsRef.current.delete(tripId);
    saveRestoredTripIdsToStorage(Array.from(restoredTripIdsRef.current));
    const nowStr = formatUnifiedTime(currentTime, settings.timeZone);
    const nextTrips = rawTripsRef.current.map((t) => {
      if (t.id === tripId) {
        return {
          ...t,
          actualArrivalTime: nowStr,
          actualStatus: 'completed' as const,
        };
      }
      return t;
    });
    setRawTrips(nextTrips);
    persistActiveTrips(nextTrips, dataSourceRef.current);
  }, [currentTime, settings.timeZone, persistActiveTrips]);

  const criticalAlertsCount = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;

  // Loading skeleton while checking Firebase Auth session
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#F7FBFE] via-[#EEF7FC] to-[#F7FBFE] dark:from-[#0B1120] dark:via-[#0F172A] dark:to-[#0B1120] p-3 sm:p-4 flex flex-col gap-3.5 font-sans select-none">
        {/* Header Skeleton */}
        <div className="w-full h-20 rounded-2xl bg-white/90 dark:bg-[#131C31]/90 border border-[#A9DDF5] dark:border-slate-700 shadow-sm p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#A9DDF5]/40 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="w-36 h-4 rounded-lg bg-[#A9DDF5]/50 dark:bg-slate-700" />
              <div className="w-24 h-3 rounded-lg bg-[#A9DDF5]/35 dark:bg-slate-800" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block w-36 h-11 rounded-xl bg-[#A9DDF5]/35 dark:bg-slate-800" />
            <div className="w-40 h-11 rounded-xl bg-[#A9DDF5]/40 dark:bg-slate-700" />
          </div>
        </div>

        {/* Main Shell Skeleton */}
        <div className="flex-1 flex gap-3.5">
          {/* Sidebar Skeleton */}
          <div className="hidden md:flex w-28 flex-col gap-2.5 bg-white/90 dark:bg-[#131C31]/90 border border-[#A9DDF5] dark:border-slate-700 rounded-2xl p-2.5 shadow-sm animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-full h-16 rounded-xl bg-[#A9DDF5]/30 dark:bg-slate-800" />
            ))}
          </div>

          <div className="flex-1 flex flex-col gap-3.5">
            {/* KPI Strip Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-white/90 dark:bg-[#131C31]/90 border border-[#A9DDF5] dark:border-slate-700 shadow-sm p-4 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-24 h-3.5 rounded bg-[#A9DDF5]/45 dark:bg-slate-700" />
                    <div className="w-8 h-8 rounded-xl bg-[#483878]/15 dark:bg-slate-700" />
                  </div>
                  <div className="w-16 h-8 rounded-lg bg-[#A9DDF5]/40 dark:bg-slate-800" />
                </div>
              ))}
            </div>

            {/* Content Cards Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 animate-pulse">
              <div className="lg:col-span-8 min-h-[300px] rounded-2xl bg-white/90 dark:bg-[#131C31]/90 border border-[#A9DDF5] dark:border-slate-700 shadow-sm p-5 space-y-4">
                <div className="w-48 h-5 rounded-lg bg-[#A9DDF5]/45 dark:bg-slate-700" />
                <div className="w-full h-36 rounded-2xl bg-[#A9DDF5]/25 dark:bg-slate-800" />
              </div>
              <div className="lg:col-span-4 min-h-[300px] rounded-2xl bg-white/90 dark:bg-[#131C31]/90 border border-[#A9DDF5] dark:border-slate-700 shadow-sm p-5 space-y-3">
                <div className="w-36 h-5 rounded-lg bg-[#A9DDF5]/45 dark:bg-slate-700" />
                {[1, 2, 3, 4].map((r) => (
                  <div key={r} className="w-full h-10 rounded-xl bg-[#A9DDF5]/25 dark:bg-slate-800" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show the Login Page
  if (!currentUser) {
    return (
      <LoginPage
        initialError={authError}
        onLoginSuccess={(user) => {
          setAuthError(null);
          setCurrentUser(user);
        }}
      />
    );
  }

  const isGeneralManager = currentUser.role === 'general_manager';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7FBFE] via-[#EEF7FC] to-[#F7FBFE] dark:from-[#0B1120] dark:via-[#0F172A] dark:to-[#0B1120] text-[#444444] dark:text-slate-200 p-3 sm:p-4 pb-24 md:pb-4 flex flex-col font-sans select-none antialiased transition-colors">
      {/* 1. Header with DMTC Brand & Official Logo + Logged-in User Profile */}
      <Header
        currentTime={currentTime}
        timeZone={settings.timeZone}
        currentUser={currentUser}
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
        onLogout={async () => {
          await logoutUser();
          setCurrentUser(null);
          setActiveTab('dashboard');
        }}
      />

      {/* 2. Main Container with Sidebar + Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-3.5">
        {/* Left Sidebar Navigation (Fixed bottom bar on mobile < 768px) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          onOpenImport={() => setIsImportModalOpen(true)}
          alertCount={criticalAlertsCount}
          isGeneralManager={isGeneralManager}
        />

        {/* Right Main Content */}
        <div className="flex-1 flex flex-col gap-3.5 overflow-hidden">
          {/* Top 6 KPI Summary Cards */}
          <KPICards
            kpis={kpis}
            onOpenDelayedDrawer={() => setIsDelayedDrawerOpen(true)}
          />

          {/* Operations Report Export Bar (Excel / PDF) - Hidden when no trips exist */}
          {activeTab !== 'users' && computedTrips.length > 0 && (
            <div className="bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm shrink-0">
                  <FileDown className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-[#483878] dark:text-slate-100">
                      تصدير ومشاركة تقارير التشغيل
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F7FBFE] dark:bg-slate-800 text-[#4A9FD8] dark:text-[#A9DDF5] border border-[#A9DDF5] dark:border-slate-700">
                      {computedTrips.length} رحلة
                    </span>
                  </div>
                  <span className="text-xs text-[#444444] dark:text-slate-300 font-semibold">
                    تصدير قائمة الرحلات الحالية مع ملخص الأداء كملف Excel (.xlsx) أو تقرير PDF جاهز للمشاركة
                  </span>
                </div>
              </div>

              <ReportExportButtons
                trips={computedTrips}
                kpis={kpis}
                companyName={settings.companyName}
                exportedBy={`${currentUser.displayName} (${currentUser.roleTitle})`}
                currentTime={currentTime}
              />
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col gap-3.5">
              {/* Middle Row: Animated Bus Movement Center (Left/Center) + Upcoming Departures (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-8">
                  <AnimatedBusMovementCenter
                    trips={computedTrips}
                    currentTime={currentTime}
                    onSelectTrip={(t) => setSelectedTrip(t)}
                    onOpenImport={() => setIsImportModalOpen(true)}
                    enableDashboardFeatures={true}
                  />
                </div>
                <div className="lg:col-span-4">
                  <UpcomingDeparturesBoard
                    trips={computedTrips}
                    currentTime={currentTime}
                    onSelectTrip={(t) => setSelectedTrip(t)}
                  />
                </div>
              </div>

              {/* Bottom Row: 2 Analytics Charts (Alerts moved above) */}
              <BottomPanels
                trips={computedTrips}
                alerts={alerts}
                hideAlertsPanel={true}
              />
            </div>
          )}

          {activeTab === 'movement' && (
            <div className="flex-1 flex flex-col gap-3.5">
              <AnimatedBusMovementCenter
                trips={computedTrips}
                currentTime={currentTime}
                onSelectTrip={(t) => setSelectedTrip(t)}
                onOpenImport={() => setIsImportModalOpen(true)}
              />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="flex-1 flex flex-col gap-3.5">
              <DailyTripTimeline
                trips={computedTrips}
                currentTime={currentTime}
                onSelectTrip={(t) => setSelectedTrip(t)}
                enableArchive={true}
                currentUser={currentUser}
                autoArchiveNotice={autoArchiveNotice}
                onDismissAutoArchiveNotice={() => setAutoArchiveNotice(null)}
                onRestoreArchive={(restoredTrips) => {
                  const normalized = restoredTrips.map((t, idx) => {
                    const id = t.id || `restored-${idx}-${Date.now()}`;
                    restoredTripIdsRef.current.add(id);
                    return {
                      ...t,
                      id,
                      isElapsedAtImport:
                        t.status === 'completed_scheduled' ? true : t.isElapsedAtImport,
                    };
                  });
                  saveRestoredTripIdsToStorage(Array.from(restoredTripIdsRef.current));
                  setRawTrips(normalized);
                  setDataSource('scheduled');
                  persistActiveTrips(normalized, 'scheduled');
                }}
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="flex-1 flex flex-col gap-3.5">
              <AlertCenter
                alerts={alerts}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onAcknowledgeAll={handleAcknowledgeAll}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex-1 flex flex-col gap-3.5">
              <OperationalAnalytics trips={computedTrips} />
            </div>
          )}

          {activeTab === 'users' && isGeneralManager && (
            <UserManagementPanel currentUser={currentUser} />
          )}
        </div>
      </div>

      {/* Modals */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmImport}
        existingTrips={rawTrips}
        onLoadDemoData={handleLoadDemoData}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettingsToStorage(newSettings);
        }}
        onResetToDefaults={() => {
          setSettings(DEFAULT_SETTINGS);
          saveSettingsToStorage(DEFAULT_SETTINGS);
        }}
        onLoadDemoData={handleLoadDemoData}
        onClearAllData={handleClearAllData}
        trips={computedTrips}
      />

      <TripDetailModal
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onConfirmActualArrival={handleConfirmActualArrival}
      />

      <DelayedTripsDrawer
        isOpen={isDelayedDrawerOpen}
        onClose={() => setIsDelayedDrawerOpen(false)}
        trips={computedTrips}
        currentTime={currentTime}
        onSelectTrip={(t) => setSelectedTrip(t)}
      />

      <SyncConflictModal
        conflict={syncConflict}
        timeZone={settings.timeZone}
        isApplying={isApplyingSyncChoice}
        onChooseCloud={() => {
          if (!syncConflict) return;
          const { cloud } = syncConflict;
          const mutationMs = cloud.updatedAtMs || Date.now();
          lastLocalMutationMsRef.current = mutationMs;
          saveTripsToStorage(cloud.trips, cloud.source, { mutationMs });
          setDataSource(cloud.source);
          setRawTrips(cloud.trips);
          startupReconcileDoneRef.current = true;
          setSyncConflict(null);
        }}
        onChooseLocal={async () => {
          if (!syncConflict || !currentUser) return;
          setIsApplyingSyncChoice(true);
          try {
            const { local } = syncConflict;
            const nowMs = Date.now();
            lastLocalMutationMsRef.current = nowMs;
            saveTripsToStorage(local.trips, local.source, { mutationMs: nowMs });
            setDataSource(local.source);
            setRawTrips(local.trips);
            await saveActiveScheduleToCloud({
              trips: local.trips,
              dataSource: local.source,
              updatedByName: currentUser.displayName,
            });
            startupReconcileDoneRef.current = true;
            setSyncConflict(null);
          } finally {
            setIsApplyingSyncChoice(false);
          }
        }}
        onMergeBoth={async () => {
          if (!syncConflict || !currentUser) return;
          setIsApplyingSyncChoice(true);
          try {
            const { local, cloud, recommended } = syncConflict;
            const baseTrips = recommended === 'local' ? cloud.trips : local.trips;
            const newerTrips = recommended === 'local' ? local.trips : cloud.trips;
            const merged = mergeTrips(baseTrips, newerTrips, 'update').merged;
            const mergedSource: DataSourceType =
              recommended === 'local' ? local.source : cloud.source;
            const nowMs = Date.now();
            lastLocalMutationMsRef.current = nowMs;
            saveTripsToStorage(merged, mergedSource, { mutationMs: nowMs });
            setDataSource(mergedSource);
            setRawTrips(merged);
            await saveActiveScheduleToCloud({
              trips: merged,
              dataSource: mergedSource,
              updatedByName: currentUser.displayName,
            });
            startupReconcileDoneRef.current = true;
            setSyncConflict(null);
          } finally {
            setIsApplyingSyncChoice(false);
          }
        }}
      />
    </div>
  );
}
