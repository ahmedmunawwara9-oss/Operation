import { Trip, OperationalAlert, TripConflict } from '../types';

/**
 * Checks for scheduling overlaps, duplicates, and missing critical fields.
 * Generates both trip-level conflict annotations and system-level alerts.
 */
export function detectConflictsAndGenerateAlerts(
  trips: Trip[],
  currentTime: Date,
  departureWarningMinutes: number = 30
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

  // 1. Check for Duplicate Trip Numbers
  const tripNumberMap = new Map<string, Trip[]>();
  for (const trip of trips) {
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
  const busGroupMap = new Map<string, Trip[]>();
  for (const trip of trips) {
    if (!trip.busId || trip.busId.trim() === '') {
      alerts.push({
        id: `alert-nobus-${trip.id}`,
        type: 'missing_info',
        severity: 'warning',
        title: `رحلة بدون رقم حافلة (${trip.tripNumber})`,
        tripNumber: trip.tripNumber,
        explanation: `الرحلة المتجهة إلى "${trip.destination}" لا تحتوي على رقم حافلة محدد.`,
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
  for (const trip of trips) {
    if (!trip.driverName || trip.driverName.trim() === '') {
      alerts.push({
        id: `alert-nodriver-${trip.id}`,
        type: 'missing_info',
        severity: 'warning',
        title: `رحلة بدون سائق (${trip.tripNumber})`,
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

  // 4. Departure Approaching & Operational Time Status Alerts
  const currentMs = currentTime.getTime();
  for (const trip of trips) {
    const depMs = new Date(trip.departureDateTime).getTime();
    const arrMs = new Date(trip.arrivalDateTime).getTime();
    const diffDepMin = Math.round((depMs - currentMs) / 60000);

    // Trip departing soon (e.g. within warning threshold and hasn't started)
    if (diffDepMin > 0 && diffDepMin <= departureWarningMinutes) {
      alerts.push({
        id: `alert-dep-soon-${trip.id}`,
        type: 'departure_soon',
        severity: diffDepMin <= 15 ? 'warning' : 'info',
        title: `اقتراب موعد انطلاق رحلة (${trip.tripNumber})`,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `الرحلة المتجهة إلى "${trip.destination}" تنطلق بعد ${diffDepMin} دقيقة (الساعة ${trip.departureTime}).`,
        recommendedAction: 'التأكد من جاهزية الحافلة وصعود الركاب عند الرصيف.',
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }

    // Scheduled arrival time exceeded without confirmed operational arrival (skip elapsed trips from Excel import)
    if (
      currentMs > arrMs &&
      !trip.actualArrivalTime &&
      trip.actualStatus !== 'completed' &&
      !trip.isElapsedAtImport
    ) {
      const exceededMin = Math.round((currentMs - arrMs) / 60000);
      alerts.push({
        id: `alert-exceeded-${trip.id}`,
        type: 'exceeded_unconfirmed',
        severity: 'warning',
        title: `تجاوز الوقت المجدول - غير مؤكد (${trip.tripNumber})`,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `انتهى الوقت المجدول للرحلة منذ ${exceededMin} دقيقة دون تأكيد وصول ميداني مسجل.`,
        recommendedAction: 'الاتصال بالسائق للتحقق من موقع الحافلة وتأكيد الوصول.',
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        acknowledged: false,
      });
    }

    // Confirmed delay in operational data
    if (trip.actualStatus === 'delayed' || (trip.delayMinutes && trip.delayMinutes > 0)) {
      alerts.push({
        id: `alert-delayed-${trip.id}`,
        type: 'confirmed_delay',
        severity: 'critical',
        title: `تأخير مؤكد ميدانياً (${trip.tripNumber})`,
        tripNumber: trip.tripNumber,
        busId: trip.busId,
        driverName: trip.driverName,
        explanation: `تم تسجيل تأخير مؤكد للرحلة بمقدار ${trip.delayMinutes || 15} دقيقة.`,
        recommendedAction: 'تحديث شاشات صالة الركاب وإبلاغ المشرف الميداني.',
        timestamp: new Date().toLocaleTimeString('ar-SA'),
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
