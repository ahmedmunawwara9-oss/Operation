export type TripStatus =
  | 'scheduled_upcoming'      // قادمة
  | 'in_progress_scheduled'   // جاري تنفيذها حسب الجدول
  | 'completed_scheduled'     // مكتملة حسب الجدول
  | 'started_actual'          // بدأت فعلياً
  | 'completed_actual'        // مكتملة فعلياً
  | 'delayed_confirmed'       // تأخير مؤكد
  | 'needs_confirmation'      // تجاوز الوقت المجدول - بحاجة إلى تأكيد
  | 'cancelled'               // ملغاة
  | 'conflict';               // تعارض في الجدول

export interface TripConflict {
  type: 'bus_overlap' | 'driver_overlap' | 'duplicate_record' | 'time_invalid';
  description: string;
  withTripId?: string;
  withTripNumber?: string;
}

export interface Trip {
  id: string;
  tripNumber: string;         // رقم الرحلة
  busId: string;              // رقم الحافلة
  plateNumber?: string;       // رقم اللوحة
  driverName: string;         // اسم السائق
  driverPhone?: string;       // هاتف السائق
  origin: string;             // نقطة الانطلاق
  destination: string;        // الوجهة
  tripDate: string;           // YYYY-MM-DD
  departureTime: string;      // HH:mm
  arrivalTime: string;        // HH:mm
  departureDateTime: string;  // ISO string
  arrivalDateTime: string;    // ISO string
  isOvernight: boolean;       // هل تمر بمنتصف الليل
  durationMinutes: number;    // مدة الرحلة بالدقائق
  route?: string;             // مسار الرحلة
  shift?: string;             // الوردية
  passengerCount?: number;    // عدد الركاب
  notes?: string;             // ملاحظات
  
  // Real Operational fields (optional)
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  actualStatus?: 'started' | 'completed' | 'delayed' | 'cancelled';
  delayMinutes?: number;
  isElapsedAtImport?: boolean;

  // Runtime computed fields
  status: TripStatus;
  progress: number;           // 0 to 1
  elapsedMinutes: number;
  remainingMinutes: number;
  conflicts: TripConflict[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface OperationalAlert {
  id: string;
  type: 'bus_conflict' | 'driver_conflict' | 'duplicate' | 'time_invalid' | 'departure_soon' | 'exceeded_unconfirmed' | 'confirmed_delay' | 'missing_info';
  severity: AlertSeverity;
  title: string;
  tripId?: string;
  tripNumber?: string;
  busId?: string;
  driverName?: string;
  explanation: string;
  recommendedAction: string;
  timestamp: string;
  acknowledged: boolean;
}

export type DataSourceType = 'demo' | 'scheduled' | 'gps_live';

export interface AppSettings {
  companyName: string;
  dashboardTitle: string;
  timeZone: string;
  language: 'ar' | 'en';
  tvRotationInterval: number; // in seconds
  activeBusLimit: number;
  simulationSpeed: number;    // 1, 5, 10, 30, 60
  simulationMode: boolean;
  autoRotateTV: boolean;
  enabledTVScreens: ('overview' | 'movement' | 'departures' | 'timeline' | 'analytics')[];
  departureWarningMinutes: number;
  overnightInference: boolean;
}

export interface ColumnMapping {
  tripNumber: string;
  busId: string;
  driverName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  tripDate?: string;
  route?: string;
  passengerCount?: string;
  plateNumber?: string;
  notes?: string;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  actualStatus?: string;
  delayMinutes?: string;
}

export interface ImportedRowPreview {
  rowIndex: number;
  raw: Record<string, any>;
  parsed?: Partial<Trip>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isExcluded?: boolean;
}

export interface ScheduleArchive {
  archiveId: string;
  title: string;
  scheduleDate: string;
  notes?: string;
  visibility: 'team';
  totalTrips: number;
  totalBuses: number;
  completedTrips: number;
  trips: Trip[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
