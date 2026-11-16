import { Trip, TripStatus, DataSourceType } from '../types';
import { getEffectiveArrivalInfo, getOperationalDateString } from './dateTimeUtils';
import { DEPARTURE_LIFECYCLE_CONFIG } from '../config/departuresConfig';

export interface ScheduleKPIs {
  totalTrips: number;
  inProgressTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  delayedConfirmedTrips: number;
  unconfirmedExceededTrips: number;
  uniqueBusesCount: number;
  uniqueDriversCount: number;
  conflictCount: number;
  totalPassengers: number;
}

export function hasTripDeparted(trip: Trip): boolean {
  return (
    trip.actualStatus === 'started' ||
    trip.actualStatus === 'completed' ||
    Boolean(trip.actualDepartureTime && trip.actualDepartureTime.trim() !== '')
  );
}

export function isTripUnassigned(trip: Trip): boolean {
  const bus = (trip.busId || '').trim();
  const driver = (trip.driverName || '').trim();
  const busMissing = !bus || bus === 'غير محدد';
  const driverMissing = !driver || driver === 'غير محدد' || driver === 'سائق غير معين';
  return busMissing || driverMissing;
}

export function computeTripRuntimeState(
  trip: Trip,
  currentTime: Date,
  dataSource?: DataSourceType
): Trip {
  const currentMs = currentTime.getTime();
  const depMs = new Date(trip.departureDateTime).getTime();
  const arrMs = new Date(trip.arrivalDateTime).getTime();
  const { effectiveArrivalMs, usedActualArrival } = getEffectiveArrivalInfo(trip);
  const effectiveArrMs = !Number.isNaN(effectiveArrivalMs) ? effectiveArrivalMs : arrMs;

  const totalDurationMs = Math.max(60000, effectiveArrMs - depMs); // at least 1 min to prevent division by zero
  const rawProgress = (currentMs - depMs) / totalDurationMs;
  const progress = Math.max(0, Math.min(1, rawProgress));

  const elapsedMs = Math.max(0, Math.min(currentMs - depMs, totalDurationMs));
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  const remainingMs = Math.max(0, effectiveArrMs - currentMs);
  const remainingMinutes = Math.floor(remainingMs / 60000);

  const departed = hasTripDeparted(trip);
  const notStartedDelayMs = DEPARTURE_LIFECYCLE_CONFIG.NOT_STARTED_DELAY_MINUTES * 60000;

  // Status Precedence
  let status: TripStatus = 'scheduled_upcoming';

  if (trip.actualStatus === 'cancelled') {
    status = 'cancelled';
  } else if (trip.actualStatus === 'completed' || (currentMs >= effectiveArrMs && usedActualArrival)) {
    status = 'completed_actual';
  } else if (Boolean(trip.isElapsedAtImport) && currentMs >= effectiveArrMs) {
    status = usedActualArrival ? 'completed_actual' : 'completed_scheduled';
  } else if (trip.conflicts && trip.conflicts.length > 0) {
    status = 'conflict';
  } else if (trip.actualStatus === 'delayed' || (trip.delayMinutes && trip.delayMinutes > 0)) {
    status = 'delayed_confirmed';
  } else if (departed) {
    status = currentMs < effectiveArrMs ? 'started_actual' : 'completed_scheduled';
  } else if (dataSource === 'gps_live' && currentMs >= depMs) {
    status = currentMs < effectiveArrMs ? 'in_progress_scheduled' : 'completed_scheduled';
  } else if (currentMs < depMs + notStartedDelayMs && currentMs < effectiveArrMs) {
    // Still before scheduled departure or within the pre-delay grace window
    status = 'scheduled_upcoming';
  } else {
    // Exceeded NOT_STARTED_DELAY_MINUTES after departure without starting -> escalates to delayed
    status = 'needs_confirmation';
  }

  return {
    ...trip,
    status,
    progress,
    elapsedMinutes,
    remainingMinutes,
  };
}

export function computeAllTripsRuntime(
  trips: Trip[],
  currentTime: Date,
  dataSource?: DataSourceType
): Trip[] {
  return trips.map((trip) => computeTripRuntimeState(trip, currentTime, dataSource));
}

export function isTripForOperationalDate(
  trip: Trip,
  targetDateStr: string,
  timeZone?: string
): boolean {
  if (!targetDateStr) return true;
  const rawDate = (trip.tripDate || '').trim();
  if (rawDate) {
    return rawDate === targetDateStr;
  }
  if (trip.departureDateTime) {
    const depDate = new Date(trip.departureDateTime);
    if (!isNaN(depDate.getTime())) {
      return getOperationalDateString(depDate, timeZone) === targetDateStr;
    }
  }
  return false;
}

export function calculateFleetKPIs(
  activeTrips: Trip[],
  archivedTodayTrips: Trip[] = [],
  todayDateStr?: string,
  timeZone?: string
): ScheduleKPIs {
  const todayActiveTrips = todayDateStr
    ? activeTrips.filter((t) => isTripForOperationalDate(t, todayDateStr, timeZone))
    : activeTrips;

  const todayArchivedCandidate = todayDateStr
    ? archivedTodayTrips.filter((t) => isTripForOperationalDate(t, todayDateStr, timeZone))
    : archivedTodayTrips;

  const activeIds = new Set<string>();
  const activeSignatures = new Set<string>();
  for (const t of todayActiveTrips) {
    if (t.id) activeIds.add(t.id);
    activeSignatures.add(`${t.tripNumber}|${t.tripDate}|${t.departureTime}|${t.busId}`);
  }

  const todayArchivedTrips = todayArchivedCandidate.filter((t) => {
    if (t.status === 'cancelled' || t.actualStatus === 'cancelled') return false;
    if (t.id && activeIds.has(t.id)) return false;
    const sig = `${t.tripNumber}|${t.tripDate}|${t.departureTime}|${t.busId}`;
    return !activeSignatures.has(sig);
  });

  const uniqueBuses = new Set<string>();
  const uniqueDrivers = new Set<string>();
  let totalActiveToday = 0;
  let inProgress = 0;
  let upcoming = 0;
  let completed = 0;
  let delayedConfirmed = 0;
  let unconfirmedExceeded = 0;
  let conflictCount = 0;
  let totalPassengers = 0;

  for (const t of todayActiveTrips) {
    if (t.status === 'cancelled' || t.actualStatus === 'cancelled') continue;
    totalActiveToday++;
    if (t.busId) uniqueBuses.add(t.busId);
    if (t.driverName) uniqueDrivers.add(t.driverName);
    if (t.passengerCount) totalPassengers += t.passengerCount;

    if (t.status === 'in_progress_scheduled' || t.status === 'started_actual') {
      inProgress++;
    } else if (t.status === 'scheduled_upcoming') {
      upcoming++;
    } else if (t.status === 'completed_scheduled' || t.status === 'completed_actual') {
      completed++;
    } else if (t.status === 'delayed_confirmed') {
      delayedConfirmed++;
    } else if (t.status === 'needs_confirmation') {
      unconfirmedExceeded++;
    }

    if (t.status === 'conflict' || (t.conflicts && t.conflicts.length > 0)) {
      conflictCount++;
    }
  }

  for (const t of todayArchivedTrips) {
    if (t.busId) uniqueBuses.add(t.busId);
    if (t.driverName) uniqueDrivers.add(t.driverName);
    if (t.passengerCount) totalPassengers += t.passengerCount;
    completed++;
  }

  return {
    totalTrips: totalActiveToday + todayArchivedTrips.length,
    inProgressTrips: inProgress,
    upcomingTrips: upcoming,
    completedTrips: completed,
    delayedConfirmedTrips: delayedConfirmed,
    unconfirmedExceededTrips: unconfirmedExceeded,
    uniqueBusesCount: uniqueBuses.size,
    uniqueDriversCount: uniqueDrivers.size,
    conflictCount,
    totalPassengers,
  };
}

/**
 * Arabic label and styling colors for each status
 */
export function getStatusMeta(status: TripStatus, lang: 'ar' | 'en' = 'ar'): {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  colorHex: string;
} {
  switch (status) {
    case 'in_progress_scheduled':
      return {
        label: lang === 'ar' ? 'جاري حسب الجدول' : 'In Progress (Sched)',
        badgeBg: 'bg-[#22A06B]/10',
        badgeText: 'text-[#22A06B]',
        badgeBorder: 'border-[#22A06B]/30',
        colorHex: '#22A06B',
      };
    case 'started_actual':
      return {
        label: lang === 'ar' ? 'بدأت فعلياً' : 'Started (Actual)',
        badgeBg: 'bg-[#22A06B]/10',
        badgeText: 'text-[#22A06B]',
        badgeBorder: 'border-[#22A06B]/30',
        colorHex: '#22A06B',
      };
    case 'scheduled_upcoming':
      return {
        label: lang === 'ar' ? 'مجدولة قادمة' : 'Upcoming',
        badgeBg: 'bg-[#2E7CF6]/10',
        badgeText: 'text-[#2E7CF6]',
        badgeBorder: 'border-[#2E7CF6]/30',
        colorHex: '#2E7CF6',
      };
    case 'completed_scheduled':
      return {
        label: lang === 'ar' ? 'منتهية حسب الجدول' : 'Completed (Sched)',
        badgeBg: 'bg-[#22A06B]/10',
        badgeText: 'text-[#22A06B]',
        badgeBorder: 'border-[#22A06B]/30',
        colorHex: '#22A06B',
      };
    case 'completed_actual':
      return {
        label: lang === 'ar' ? 'مكتملة فعلياً' : 'Completed (Actual)',
        badgeBg: 'bg-[#22A06B]/10',
        badgeText: 'text-[#22A06B]',
        badgeBorder: 'border-[#22A06B]/30',
        colorHex: '#22A06B',
      };
    case 'delayed_confirmed':
      return {
        label: lang === 'ar' ? 'تأخير مؤكد' : 'Confirmed Delay',
        badgeBg: 'bg-[#D92D20]/10',
        badgeText: 'text-[#D92D20]',
        badgeBorder: 'border-[#D92D20]/30',
        colorHex: '#D92D20',
      };
    case 'needs_confirmation':
      return {
        label: lang === 'ar' ? 'تجاوز الموعد (غير مؤكد)' : 'Exceeded Time (Unconfirmed)',
        badgeBg: 'bg-[#E5A100]/12',
        badgeText: 'text-[#E5A100]',
        badgeBorder: 'border-[#E5A100]/40',
        colorHex: '#E5A100',
      };
    case 'conflict':
      return {
        label: lang === 'ar' ? 'تعارض في الجدول' : 'Schedule Conflict',
        badgeBg: 'bg-[#D92D20]/10',
        badgeText: 'text-[#D92D20]',
        badgeBorder: 'border-[#D92D20]/35',
        colorHex: '#D92D20',
      };
    case 'cancelled':
      return {
        label: lang === 'ar' ? 'ملغاة' : 'Cancelled',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-[#444444]',
        badgeBorder: 'border-slate-200',
        colorHex: '#444444',
      };
    default:
      return {
        label: lang === 'ar' ? 'غير معروف' : 'Unknown',
        badgeBg: 'bg-[#2E7CF6]/10',
        badgeText: 'text-[#2E7CF6]',
        badgeBorder: 'border-[#2E7CF6]/30',
        colorHex: '#2E7CF6',
      };
  }
}
