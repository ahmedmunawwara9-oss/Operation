import { Trip, TripStatus } from '../types';

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

export function computeTripRuntimeState(trip: Trip, currentTime: Date): Trip {
  const currentMs = currentTime.getTime();
  const depMs = new Date(trip.departureDateTime).getTime();
  const arrMs = new Date(trip.arrivalDateTime).getTime();

  const totalDurationMs = Math.max(60000, arrMs - depMs); // at least 1 min to prevent division by zero
  const rawProgress = (currentMs - depMs) / totalDurationMs;
  const progress = Math.max(0, Math.min(1, rawProgress));

  const elapsedMs = Math.max(0, Math.min(currentMs - depMs, totalDurationMs));
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  const remainingMs = Math.max(0, arrMs - currentMs);
  const remainingMinutes = Math.floor(remainingMs / 60000);

  // Status Precedence
  let status: TripStatus = 'scheduled_upcoming';

  if (trip.actualStatus === 'cancelled') {
    status = 'cancelled';
  } else if (trip.conflicts && trip.conflicts.length > 0) {
    status = 'conflict';
  } else if (trip.actualStatus === 'delayed') {
    status = 'delayed_confirmed';
  } else if (trip.actualStatus === 'completed') {
    status = 'completed_actual';
  } else if (trip.actualStatus === 'started') {
    status = 'started_actual';
  } else if (currentMs < depMs) {
    status = 'scheduled_upcoming';
  } else if (currentMs >= depMs && currentMs < arrMs) {
    status = 'in_progress_scheduled';
  } else {
    // Current time is past scheduled arrival time
    if (trip.actualArrivalTime) {
      status = 'completed_actual';
    } else if (trip.isElapsedAtImport) {
      // Elapsed trip at Excel import time is treated as completed/finished rather than delayed
      status = 'completed_scheduled';
    } else {
      status = 'needs_confirmation';
    }
  }

  return {
    ...trip,
    status,
    progress,
    elapsedMinutes,
    remainingMinutes,
  };
}

export function computeAllTripsRuntime(trips: Trip[], currentTime: Date): Trip[] {
  return trips.map(trip => computeTripRuntimeState(trip, currentTime));
}

export function calculateFleetKPIs(trips: Trip[]): ScheduleKPIs {
  const uniqueBuses = new Set<string>();
  const uniqueDrivers = new Set<string>();
  let inProgress = 0;
  let upcoming = 0;
  let completed = 0;
  let delayedConfirmed = 0;
  let unconfirmedExceeded = 0;
  let conflictCount = 0;
  let totalPassengers = 0;

  for (const t of trips) {
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

  return {
    totalTrips: trips.length,
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
