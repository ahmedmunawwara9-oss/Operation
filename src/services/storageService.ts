import { Trip, AppSettings, DataSourceType } from '../types';

const STORAGE_KEYS = {
  TRIPS: 'smart_bus_fleet_trips_v1',
  SETTINGS: 'smart_bus_fleet_settings_v1',
  DATA_SOURCE: 'smart_bus_fleet_datasource_v1',
  LAST_IMPORT: 'smart_bus_fleet_last_import_v1',
  LAST_MUTATION_MS: 'smart_bus_fleet_last_mutation_ms_v1',
  LAST_CLEAR_MS: 'smart_bus_fleet_last_clear_ms_v1',
  ACK_ALERTS: 'smart_bus_fleet_ack_alerts_v1',
  ARCHIVED_TODAY: 'dmtc_archived_today_v1',
  RESTORED_TRIP_IDS: 'dmtc_restored_trip_ids_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'درة المنورة لنقل الحجاج والمعتمرين',
  dashboardTitle: 'مركز مراقبة وتشغيل الحافلات',
  timeZone: 'Asia/Riyadh',
  language: 'ar',
  tvRotationInterval: 20,
  activeBusLimit: 8,
  simulationSpeed: 1,
  simulationMode: false,
  autoRotateTV: true,
  enabledTVScreens: ['overview', 'movement', 'departures', 'timeline', 'analytics'],
  departureWarningMinutes: 30,
  overnightInference: true,
  departureSoundEnabled: false,
};

const IDB_NAME = 'dmtc_fleet_persistence_db';
const IDB_VERSION = 1;
const IDB_STORE = 'schedule_snapshots';
const IDB_ACTIVE_KEY = 'active_schedule';

export interface LocalScheduleSnapshot {
  trips: Trip[];
  source: DataSourceType;
  lastMutationMs: number;
  storageOrigin: 'indexeddb' | 'localstorage';
}

function openPersistenceDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveTripsToIndexedDB(
  trips: Trip[],
  source: DataSourceType,
  mutationMs: number
): Promise<void> {
  const db = await openPersistenceDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(
        {
          trips,
          source,
          lastMutationMs: mutationMs,
        },
        IDB_ACTIVE_KEY
      );
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function loadTripsFromIndexedDB(): Promise<LocalScheduleSnapshot | null> {
  const db = await openPersistenceDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_ACTIVE_KEY);
      req.onsuccess = () => {
        const val = req.result as
          | { trips?: unknown; source?: DataSourceType; lastMutationMs?: number }
          | undefined;
        db.close();
        if (val && Array.isArray(val.trips)) {
          resolve({
            trips: val.trips as Trip[],
            source: val.source === 'demo' ? 'demo' : 'scheduled',
            lastMutationMs: typeof val.lastMutationMs === 'number' ? val.lastMutationMs : 0,
            storageOrigin: 'indexeddb',
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function clearTripsFromIndexedDB(): Promise<void> {
  const db = await openPersistenceDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_ACTIVE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export function saveTripsToStorage(
  trips: Trip[],
  source: DataSourceType,
  options?: { mutationMs?: number }
): void {
  const mutationMs = options?.mutationMs ?? Date.now();
  try {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, source);
    localStorage.setItem(STORAGE_KEYS.LAST_IMPORT, new Date(mutationMs).toISOString());
    localStorage.setItem(STORAGE_KEYS.LAST_MUTATION_MS, String(mutationMs));
    if (trips.length > 0) {
      localStorage.removeItem(STORAGE_KEYS.LAST_CLEAR_MS);
    }
  } catch (err) {
    console.error('Failed to save trips to localStorage:', err);
  }
  void saveTripsToIndexedDB(trips, source, mutationMs);
}

export async function loadBestLocalSnapshot(): Promise<LocalScheduleSnapshot | null> {
  const ls = loadTripsFromStorage();
  const idb = await loadTripsFromIndexedDB();

  const lsSnapshot: LocalScheduleSnapshot | null =
    ls.trips !== null
      ? {
          trips: ls.trips,
          source: ls.source,
          lastMutationMs: ls.lastMutationMs,
          storageOrigin: 'localstorage',
        }
      : null;

  if (idb && lsSnapshot) {
    // Prefer IndexedDB if it has a newer timestamp or holds trips when localStorage is empty
    if (idb.lastMutationMs > lsSnapshot.lastMutationMs) {
      return idb;
    }
    if (lsSnapshot.trips.length === 0 && idb.trips.length > 0 && getExplicitClearMsFromStorage() === 0) {
      return idb;
    }
    return lsSnapshot;
  }

  return idb || lsSnapshot;
}

export function loadTripsFromStorage(): {
  trips: Trip[] | null;
  source: DataSourceType;
  lastImport: string | null;
  lastMutationMs: number;
} {
  try {
    const rawTrips = localStorage.getItem(STORAGE_KEYS.TRIPS);
    const source = (localStorage.getItem(STORAGE_KEYS.DATA_SOURCE) as DataSourceType) || 'scheduled';
    const lastImport = localStorage.getItem(STORAGE_KEYS.LAST_IMPORT);
    const rawMutationMs = localStorage.getItem(STORAGE_KEYS.LAST_MUTATION_MS);
    const lastMutationMs = rawMutationMs ? Number(rawMutationMs) || 0 : 0;

    if (rawTrips) {
      const parsed: unknown = JSON.parse(rawTrips);
      if (Array.isArray(parsed)) {
        return { trips: parsed as Trip[], source, lastImport, lastMutationMs };
      }
    }
  } catch (err) {
    console.error('Failed to load trips from localStorage:', err);
  }

  return { trips: null, source: 'scheduled', lastImport: null, lastMutationMs: 0 };
}

export function saveArchivedTodayToStorage(dateStr: string, trips: Trip[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ARCHIVED_TODAY, JSON.stringify({ dateStr, trips }));
  } catch (err) {
    console.error('Failed to save archived today trips:', err);
  }
}

export function loadArchivedTodayFromStorage(expectedDateStr: string): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARCHIVED_TODAY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && parsed.dateStr === expectedDateStr && Array.isArray(parsed.trips)) {
      return parsed.trips as Trip[];
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveRestoredTripIdsToStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RESTORED_TRIP_IDS, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

export function loadRestoredTripIdsFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESTORED_TRIP_IDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveAcknowledgedAlerts(alertIds: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACK_ALERTS, JSON.stringify(alertIds));
  } catch (err) {
    console.error('Failed to save alerts:', err);
  }
}

export function loadAcknowledgedAlerts(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACK_ALERTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markExplicitClearInStorage(clearMs: number = Date.now()): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CLEAR_MS, String(clearMs));
  } catch {
    // ignore storage errors
  }
}

export function getExplicitClearMsFromStorage(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_CLEAR_MS);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function clearSavedData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRIPS);
    localStorage.removeItem(STORAGE_KEYS.DATA_SOURCE);
    localStorage.removeItem(STORAGE_KEYS.LAST_IMPORT);
    localStorage.removeItem(STORAGE_KEYS.LAST_MUTATION_MS);
    localStorage.removeItem(STORAGE_KEYS.ACK_ALERTS);
    localStorage.removeItem(STORAGE_KEYS.ARCHIVED_TODAY);
    localStorage.removeItem(STORAGE_KEYS.RESTORED_TRIP_IDS);
  } catch (err) {
    console.error('Failed to clear trips:', err);
  }
  void clearTripsFromIndexedDB();
}

/**
 * Exports current trips to CSV with Arabic UTF-8 BOM so Excel opens it cleanly
 */
export function exportTripsToCSV(trips: Trip[], filename: string = 'bus_schedule_export.csv'): void {
  const headers = [
    'رقم الرحلة',
    'رقم الحافلة',
    'اسم السائق',
    'نقطة الانطلاق',
    'الوجهة',
    'تاريخ الرحلة',
    'وقت الانطلاق',
    'وقت الوصول',
    'المسار',
    'عدد الركاب',
    'الحالة',
    'ملاحظات',
  ];

  const rows = trips.map(t => [
    `"${t.tripNumber || ''}"`,
    `"${t.busId || ''}"`,
    `"${t.driverName || ''}"`,
    `"${t.origin || ''}"`,
    `"${t.destination || ''}"`,
    `"${t.tripDate || ''}"`,
    `"${t.departureTime || ''}"`,
    `"${t.arrivalTime || ''}"`,
    `"${t.route || ''}"`,
    t.passengerCount || 0,
    `"${t.status}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
