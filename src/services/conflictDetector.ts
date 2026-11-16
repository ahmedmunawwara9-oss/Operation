import { Trip, OperationalAlert, TripConflict } from '../types';
import { DEPARTURE_LIFECYCLE_CONFIG } from '../config/departuresConfig';
import { hasTripDeparted, isTripUnassigned } from './scheduleEngine';
import { getEffectiveArrivalInfo } from './dateTimeUtils';

function isAutoCompletedTripAtTime(trip: Trip, currentMs: number): boolean {
  if (!trip.isElapsedAtImport) return false;
  const { effectiveArrivalMs } = getEffectiveArrivalInfo(trip);
  return Number.isNaN(effectiveArrivalMs) || currentMs >= effectiveArrivalMs;
}

/**
 * Checks for scheduling overlaps, duplicates, and missing critical fields.
 * Generates both trip-level conflict annotations and system-level alerts.
 */
export function detectConflictsAndGenerateAlerts(
  trips: Trip[],
  currentTime: Date,
  departureWarningMinutes: number = DEPARTURE_LIFECYCLE_CONFIG.NEAR_WINDOW_MINUTES
): {
  tripsWithConflicts: Trip[];
  alerts: OperationalAlert[];
} {
  const alerts: OperationalAlert[] = [];
  const tripConflictsMap = new Map<string, TripConflict[]>();

  // Initialize empty conflict arrays for all trips
  for (const t of trips) {
    tripConflictsMap.set(t.id, []);
  }

  // Only evaluate active (non-cancelled) trips for conflicts and alerts
  const activeTrips = trips.filter((t) => t.actualStatus !== 'cancelled');

  // 1. Check for Duplicate Trip Numbers
  const tripNumberMap = new Map<string, Trip[]>();
  for (const trip of activeTrips) {
    const list = tripNumberMap.get(trip.tripNumber) || [];
    list.push(trip);
    tripNumberMap.set(trip.tripNumber, list);
  }

  for (const [tripNum, duplicateGroup] of tripNumberMap.entries()) {
    if (duplicateGroup.length > 1 && tripNum) {
      alerts.push({
        id: `alert-dup-${tripNum}`,
        type: 'duplicate',
        severity: 'critical',
        title: `تكرار في رقم الرحلة (${tripNum})`,
        tripNumber: tripNum,
        explanation: `يوجد ${duplicateGroup.length} رحلات مسجلة بنفس رقم الرحلة "${tripNum}".`,
        recommendedAction: 'تعديل أو دمج السجلات المكررة لتفادي الخلط في التعيينات.',
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });

      for (const t of duplicateGroup) {
        tripConflictsMap.get(t.id)?.push({
          type: 'duplicate_record',
          description: `رقم الرحلة مكرر (${duplicateGroup.length} مرات)`,
        });
      }
    }
  }

  // 2. Bus Schedule Overlaps (Same bus booked at overlapping times)
  const currentMsForChecks = currentTime.getTime();
  const busGroupMap = new Map<string, Trip[]>();
  for (const trip of activeTrips) {
    if (isAutoCompletedTripAtTime(trip, currentMsForChecks)) {
      continue;
    }
    if (!trip.busId || trip.busId.trim() === '' || trip.busId.trim() === 'غير محدد') {
      alerts.push({
        id: `alert-nobus-${trip.id}`,
        type: 'missing_info',
        severity: 'warning',
        title: `غير مسندة — رحلة بدون رقم حافلة (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        explanation: `الرحلة المتجهة إلى "${trip.destination}" لا تحتوي على رقم حافلة مسند.`,
        recommendedAction: 'تعيين حافلة للرحلة قبل حلول موعد الانطلاق.',
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
      continue;
    }

    const list = busGroupMap.get(trip.busId) || [];
    list.push(trip);
    busGroupMap.set(trip.busId, list);
  }

  for (const [busId, busTrips] of busGroupMap.entries()) {
    if (busTrips.length < 2) continue;

    for (let i = 0; i < busTrips.length; i++) {
      for (let j = i + 1; j < busTrips.length; j++) {
        const tripA = busTrips[i];
        const tripB = busTrips[j];

        const startA = new Date(tripA.departureDateTime).getTime();
        const endA = new Date(tripA.arrivalDateTime).getTime();
        const startB = new Date(tripB.departureDateTime).getTime();
        const endB = new Date(tripB.arrivalDateTime).getTime();

        // Overlap condition: startA < endB && startB < endA
        if (startA < endB && startB < endA) {
          alerts.push({
            id: `alert-bus-overlap-${tripA.id}-${tripB.id}`,
            type: 'bus_conflict',
            severity: 'critical',
            title: `تعارض تشغيلي في الحافلة (${busId})`,
            busId,
            tripNumber: `${tripA.tripNumber} & ${tripB.tripNumber}`,
            explanation: `الحافلة ${busId} مخصصة لرحلتين متداخلتين: رحلة ${tripA.tripNumber} (${tripA.departureTime} إلى ${tripA.arrivalTime}) ورحلة ${tripB.tripNumber} (${tripB.departureTime} إلى ${tripB.arrivalTime}).`,
            recommendedAction: `إعادة تخصيص حافلة بديلة لإحدى الرحلتين فوراً.`,
            timestamp: new Date().toLocaleTimeString('ar-SA'),
            acknowledged: false,
          });

          tripConflictsMap.get(tripA.id)?.push({
            type: 'bus_overlap',
            description: `تعارض حافلة مع رحلة ${tripB.tripNumber}`,
            withTripId: tripB.id,
            withTripNumber: tripB.tripNumber,
          });

          tripConflictsMap.get(tripB.id)?.push({
            type: 'bus_overlap',
            description: `تعارض حافلة مع رحلة ${tripA.tripNumber}`,
            withTripId: tripA.id,
            withTripNumber: tripA.tripNumber,
          });
        }
      }
    }
  }

  // 3. Driver Schedule Overlaps (Same driver booked at overlapping times)
  const driverGroupMap = new Map<string, Trip[]>();
  for (const trip of activeTrips) {
    if (isAutoCompletedTripAtTime(trip, currentMsForChecks)) {
      continue;
    }
    if (
      !trip.driverName ||
      trip.driverName.trim() === '' ||
      trip.driverName.trim() === 'غير محدد' ||
      trip.driverName.trim() === 'سائق غير معين'
    ) {
      alerts.push({
        id: `alert-nodriver-${trip.id}`,
        type: 'missing_info',
        severity: 'warning',
        title: `غير مسندة — رحلة بدون سائق (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        explanation: `الرحلة المتجهة إلى "${trip.destination}" بالحافلة (${trip.busId}) بدون سائق مسجل.`,
        recommendedAction: 'توجيه سائق متاح وتعيينه في جدول التشغيل.',
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
      continue;
    }

    const list = driverGroupMap.get(trip.driverName) || [];
    list.push(trip);
    driverGroupMap.set(trip.driverName, list);
  }

  for (const [driverName, driverTrips] of driverGroupMap.entries()) {
    if (driverTrips.length < 2) continue;

    for (let i = 0; i < driverTrips.length; i++) {
      for (let j = i + 1; j < driverTrips.length; j++) {
        const tripA = driverTrips[i];
        const tripB = driverTrips[j];

        const startA = new Date(tripA.departureDateTime).getTime();
        const endA = new Date(tripA.arrivalDateTime).getTime();
        const startB = new Date(tripB.departureDateTime).getTime();
        const endB = new Date(tripB.arrivalDateTime).getTime();

        if (startA < endB && startB < endA) {
          alerts.push({
            id: `alert-driver-overlap-${tripA.id}-${tripB.id}`,
            type: 'driver_conflict',
            severity: 'critical',
            title: `تعارض في جدول السائق (${driverName})`,
            driverName,
            tripNumber: `${tripA.tripNumber} & ${tripB.tripNumber}`,
            explanation: `السائق ${driverName} مسجل لقيادة رحلتين متداخلتين زمنياً (${tripA.tripNumber} و ${tripB.tripNumber}).`,
            recommendedAction: `تعيين سائق آخر لإحدى الرحلتين أو تعديل جدول الانطلاق.`,
            timestamp: new Date().toLocaleTimeString('ar-SA'),
            acknowledged: false,
          });

          tripConflictsMap.get(tripA.id)?.push({
            type: 'driver_overlap',
            description: `تعارض سائق مع رحلة ${tripB.tripNumber}`,
            withTripId: tripB.id,
            withTripNumber: tripB.tripNumber,
          });

          tripConflictsMap.get(tripB.id)?.push({
            type: 'driver_overlap',
            description: `تعارض سائق مع رحلة ${tripA.tripNumber}`,
            withTripId: tripA.id,
            withTripNumber: tripA.tripNumber,
          });
        }
      }
    }
  }

  // 4. Departure Approaching, Unassigned, & Operational Time Status Alerts
  const currentMs = currentTime.getTime();
  const nearWindowMs = DEPARTURE_LIFECYCLE_CONFIG.NEAR_WINDOW_MINUTES * 60000;
  const notStartedDelayMs = DEPARTURE_LIFECYCLE_CONFIG.NOT_STARTED_DELAY_MINUTES * 60000;

  for (const trip of activeTrips) {
    // Do NOT generate delay or departure alerts for trips auto-completed from the imported schedule
    if (isAutoCompletedTripAtTime(trip, currentMs)) {
      continue;
    }

    const depMs = new Date(trip.departureDateTime).getTime();
    const { effectiveArrivalMs, usedActualArrival } = getEffectiveArrivalInfo(trip);
    const arrMs = !Number.isNaN(effectiveArrivalMs)
      ? effectiveArrivalMs
      : new Date(trip.arrivalDateTime).getTime();
    const diffDepMs = depMs - currentMs;
    const diffDepMin = Math.round(diffDepMs / 60000);
    const departed = hasTripDeparted(trip);

    // Unassigned trip (no bus or driver) approaching departure (< 30 min)
    if (
      !departed &&
      diffDepMs > -DEPARTURE_LIFECYCLE_CONFIG.DEPARTURE_GRACE_MINUTES * 60000 &&
      diffDepMs <= nearWindowMs &&
      isTripUnassigned(trip)
    ) {
      alerts.push({
        id: `alert-unassigned-near-${trip.id}`,
        type: 'missing_info',
        severity: 'critical',
        title: `غير مسندة — رحلة تقترب من الإقلاع (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `الرحلة (${trip.tripNumber}) المتجهة إلى "${trip.destination}" تقترب من موعد المغادرة (${trip.departureTime}) وبلا حافلة أو سائق مسندين.`,
        recommendedAction: 'إسناد حافلة وسائق للرحلة فوراً قبل الإقلاع.',
        timestamp: new Date(currentMs).toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }

    // Trip departing soon (within warning threshold and hasn't started)
    if (diffDepMin > 0 && diffDepMin <= departureWarningMinutes && !departed) {
      alerts.push({
        id: `alert-dep-soon-${trip.id}`,
        type: 'departure_soon',
        severity: diffDepMin <= 15 ? 'warning' : 'info',
        title: `اقتراب موعد انطلاق رحلة (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `الرحلة المتجهة إلى "${trip.destination}" تنطلق بعد ${diffDepMin} دقيقة (الساعة ${trip.departureTime}).`,
        recommendedAction: 'التأكد من جاهزية الحافلة وصعود الركاب عند الرصيف.',
        timestamp: new Date(currentMs).toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }

    // Trip failed to depart within 5 minutes after scheduled departure
    if (
      currentMs >= depMs + notStartedDelayMs &&
      !departed &&
      !trip.isElapsedAtImport &&
      trip.actualStatus !== 'delayed'
    ) {
      const lateMin = Math.max(
        DEPARTURE_LIFECYCLE_CONFIG.NOT_STARTED_DELAY_MINUTES,
        Math.round((currentMs - depMs) / 60000)
      );
      alerts.push({
        id: `alert-not-started-${trip.id}`,
        type: 'not_started_delayed',
        severity: 'critical',
        title: `رحلة لم تنطلق في موعدها (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `مضى ${lateMin} دقيقة على موعد مغادرة الرحلة (${trip.departureTime}) المتجهة إلى "${trip.destination}" دون تأكيد انطلاقها.`,
        recommendedAction: 'التواصل الفوري مع السائق ومشرف الرصيف ومعالجة التأخير.',
        timestamp: new Date(currentMs).toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }

    // Only alert if trip was explicitly marked started without completion past arrival time
    if (
      currentMs > arrMs &&
      trip.actualStatus === 'started' &&
      !usedActualArrival &&
      !trip.actualArrivalTime &&
      !trip.isElapsedAtImport
    ) {
      const exceededMin = Math.round((currentMs - arrMs) / 60000);
      alerts.push({
        id: `alert-exceeded-${trip.id}`,
        type: 'exceeded_unconfirmed',
        severity: 'warning',
        title: `تجاوز الوقت المجدول - غير مؤكد (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `انتهى الوقت المجدول للرحلة منذ ${exceededMin} دقيقة دون تأكيد وصول ميداني مسجل.`,
        recommendedAction: 'الاتصال بالسائق للتحقق من موقع الحافلة وتأكيد الوصول.',
        timestamp: new Date(currentMs).toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }

    // Confirmed delay in operational data (never for auto-completed trips)
    if (
      !trip.isElapsedAtImport &&
      (trip.actualStatus === 'delayed' || (trip.delayMinutes && trip.delayMinutes > 0))
    ) {
      alerts.push({
        id: `alert-delayed-${trip.id}`,
        type: 'confirmed_delay',
        severity: 'critical',
        title: `تأخير مؤكد ميدانياً (${trip.tripNumber})`,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `تم تسجيل تأخير مؤكد للرحلة بمقدار ${trip.delayMinutes || 15} دقيقة.`,
        recommendedAction: 'تحديث شاشات صالة الركاب وإبلاغ المشرف الميداني.',
        timestamp: new Date(currentMs).toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }
  }

  // Attach conflicts to trips
  const tripsWithConflicts = trips.map(t => {
    const conflicts = tripConflictsMap.get(t.id) || [];
    return {
      ...t,
      conflicts,
    };
  });

  return {
    tripsWithConflicts,
    alerts,
  };
}
