import { Trip, AppSettings, DataSourceType } from '../types';

const STORAGE_KEYS = {
  TRIPS: 'smart_bus_fleet_trips_v1',
  SETTINGS: 'smart_bus_fleet_settings_v1',
  DATA_SOURCE: 'smart_bus_fleet_datasource_v1',
  LAST_IMPORT: 'smart_bus_fleet_last_import_v1',
  ACK_ALERTS: 'smart_bus_fleet_ack_alerts_v1',
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
};

export function saveTripsToStorage(trips: Trip[], source: DataSourceType): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, source);
    localStorage.setItem(STORAGE_KEYS.LAST_IMPORT, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save trips to localStorage:', err);
  }
}

export function loadTripsFromStorage(): {
  trips: Trip[] | null;
  source: DataSourceType;
  lastImport: string | null;
} {
  try {
    const rawTrips = localStorage.getItem(STORAGE_KEYS.TRIPS);
    const source = (localStorage.getItem(STORAGE_KEYS.DATA_SOURCE) as DataSourceType) || 'demo';
    const lastImport = localStorage.getItem(STORAGE_KEYS.LAST_IMPORT);

    if (rawTrips) {
      const parsed: Trip[] = JSON.parse(rawTrips);
      return { trips: parsed, source, lastImport };
    }
  } catch (err) {
    console.error('Failed to load trips from localStorage:', err);
  }

  return { trips: null, source: 'demo', lastImport: null };
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

export function clearSavedData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRIPS);
    localStorage.removeItem(STORAGE_KEYS.DATA_SOURCE);
    localStorage.removeItem(STORAGE_KEYS.LAST_IMPORT);
    localStorage.removeItem(STORAGE_KEYS.ACK_ALERTS);
  } catch (err) {
    console.error('Failed to clear trips:', err);
  }
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
