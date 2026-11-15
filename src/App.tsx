import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trip,
  AppSettings,
  DataSourceType,
  OperationalAlert,
  ColumnMapping,
} from './types';
import {
  loadTripsFromStorage,
  saveTripsToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  clearSavedData,
  DEFAULT_SETTINGS,
  loadAcknowledgedAlerts,
  saveAcknowledgedAlerts,
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
import { formatUnifiedTime } from './services/dateTimeUtils';
import { FileDown } from 'lucide-react';
import {
  AppUser,
  BOOTSTRAPPED_GM_EMAIL,
  fetchOrBootstrapUserProfile,
  logoutUser,
  isAuthTransitionInProgress,
  auth,
  db,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

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

  // 2. Trips data: STRICTLY EMPTY (cleared for fresh Excel upload)
  const [rawTrips, setRawTrips] = useState<Trip[]>(() => {
    clearSavedData();
    return [];
  });

  const [dataSource, setDataSource] = useState<DataSourceType>('scheduled');
  const [ackAlertIds, setAckAlertIds] = useState<string[]>(() => loadAcknowledgedAlerts());

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
          setRawTrips([]);
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
          setRawTrips([]);
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

  // Compute runtime statuses (progress %, elapsed, remaining)
  const computedTrips = useMemo(() => {
    return computeAllTripsRuntime(tripsWithConflicts, currentTime);
  }, [tripsWithConflicts, currentTime]);

  // Calculate fleet KPIs
  const kpis = useMemo(() => {
    return calculateFleetKPIs(computedTrips);
  }, [computedTrips]);

  // Action Handlers
  const handleConfirmImport = useCallback(
    (
      newTrips: Trip[],
      _mappingUsed: ColumnMapping,
      mode: MergeTripsMode = 'skip'
    ): MergeTripsResult => {
      const summaryResult = mergeTrips(rawTrips, newTrips, mode);
      setRawTrips((prev) => mergeTrips(prev, newTrips, mode).merged);
      setDataSource('scheduled');
      saveTripsToStorage(summaryResult.merged, 'scheduled');
      return summaryResult;
    },
    [rawTrips]
  );

  const handleLoadDemoData = useCallback(() => {
    const demo = generateDemoTrips();
    setRawTrips(demo);
    setDataSource('demo');
    saveTripsToStorage(demo, 'demo');
  }, []);

  const handleClearAllData = useCallback(() => {
    clearSavedData();
    setRawTrips([]);
  }, []);

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
    setRawTrips((prev) =>
      prev.map((t) => {
        if (t.id === tripId) {
          const nowStr = formatUnifiedTime(currentTime, settings.timeZone);
          return {
            ...t,
            actualArrivalTime: nowStr,
            actualStatus: 'completed',
          };
        }
        return t;
      })
    );
  }, [currentTime, settings.timeZone]);

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
          clearSavedData();
          setRawTrips([]);
          setAckAlertIds([]);
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
                onRestoreArchive={(restoredTrips) => {
                  const normalized = restoredTrips.map((t) =>
                    t.status === 'completed_scheduled' && !t.isElapsedAtImport
                      ? { ...t, isElapsedAtImport: true }
                      : t
                  );
                  setRawTrips(normalized);
                  setDataSource('scheduled');
                  saveTripsToStorage(normalized, 'scheduled');
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
    </div>
  );
}
