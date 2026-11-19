import React, { useState, useMemo } from 'react';
import { Bus, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import { Trip } from '../types';
import { formatShortDriverName } from '../services/dateTimeUtils';
import { computeTripDelayMinutes } from './DelayedTripsDrawer';

interface AnimatedBusMovementCenterProps {
  trips: Trip[];
  currentTime: Date;
  onSelectTrip?: (trip: Trip) => void;
  onOpenImport?: () => void;
  pageSize?: number;
  isTVMode?: boolean;
  enableDashboardFeatures?: boolean;
}

function getOperationTypeLabel(trip: Trip): string {
  if (trip.shift && trip.shift.trim()) return trip.shift.trim();
  if (trip.route && trip.route.trim()) return trip.route.trim();
  return `${trip.origin} ← ${trip.destination}`;
}

export const AnimatedBusMovementCenter: React.FC<AnimatedBusMovementCenterProps> = ({
  trips,
  currentTime,
  onSelectTrip,
  onOpenImport,
  pageSize,
  isTVMode,
  enableDashboardFeatures = false,
}) => {
  void pageSize;
  void isTVMode;

  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Distinct operation types kept intact for filter state compatibility
  const operationTypes = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => set.add(getOperationTypeLabel(t)));
    return Array.from(set);
  }, [trips]);
  void operationTypes;

  // All active trips currently on the road (excluding cancelled)
  const activeTrips = trips.filter(
    (t) =>
      t.status !== 'cancelled' &&
      t.actualStatus !== 'cancelled' &&
      (t.status === 'in_progress_scheduled' || t.status === 'started_actual')
  );

  const nonCancelledTrips = trips.filter(
    (t) => t.status !== 'cancelled' && t.actualStatus !== 'cancelled'
  );

  // Base trips to display (prioritize active trips, with just-started trips floating to the top)
  const displayTrips = useMemo(() => {
    const currentMs = currentTime.getTime();
    let list: Trip[];

    if (!enableDashboardFeatures) {
      list = activeTrips.length > 0 ? activeTrips : nonCancelledTrips;
    } else {
      const hasActiveFilters = operationTypeFilter !== 'all' || statusFilter !== 'all';
      const base = hasActiveFilters
        ? nonCancelledTrips
        : activeTrips.length > 0
        ? activeTrips
        : nonCancelledTrips;

      list = base.filter((t) => {
        if (operationTypeFilter !== 'all' && getOperationTypeLabel(t) !== operationTypeFilter) {
          return false;
        }

        if (statusFilter !== 'all') {
          const delayMin = computeTripDelayMinutes(t, currentTime);
          const isCompleted = t.status === 'completed_actual' || t.status === 'completed_scheduled';
          const isUpcoming = t.status === 'scheduled_upcoming';

          if (statusFilter === 'on_time') {
            return (
              delayMin === 0 &&
              t.status !== 'conflict' &&
              (t.status === 'in_progress_scheduled' || t.status === 'started_actual')
            );
          }
          if (statusFilter === 'delayed') {
            return delayMin > 0 || t.status === 'conflict';
          }
          if (statusFilter === 'minor_delay') {
            return delayMin > 0 && delayMin < 15;
          }
          if (statusFilter === 'major_delay') {
            return delayMin >= 15 || t.status === 'conflict';
          }
          if (statusFilter === 'upcoming') {
            return isUpcoming;
          }
          if (statusFilter === 'completed') {
            return isCompleted;
          }
        }

        return true;
      });
    }

    return [...list].sort((a, b) => {
      const depA = new Date(a.departureDateTime).getTime();
      const depB = new Date(b.departureDateTime).getTime();
      const aActive = a.status === 'in_progress_scheduled' || a.status === 'started_actual';
      const bActive = b.status === 'in_progress_scheduled' || b.status === 'started_actual';
      const aJustStarted = aActive && currentMs >= depA && currentMs - depA <= 5 * 60 * 1000;
      const bJustStarted = bActive && currentMs >= depB && currentMs - depB <= 5 * 60 * 1000;
      if (aJustStarted !== bJustStarted) return aJustStarted ? -1 : 1;
      return depA - depB;
    });
  }, [
    enableDashboardFeatures,
    nonCancelledTrips,
    activeTrips,
    operationTypeFilter,
    statusFilter,
    currentTime,
  ]);

  const filterChips = [
    { id: 'all', label: 'الكل' },
    { id: 'on_time', label: 'في الموعد' },
    { id: 'delayed', label: 'متأخرة' },
  ];

  return (
    <section className="w-full card-white rounded-2xl p-4 sm:p-6 select-none flex flex-col gap-4">
      {/* Header: Single Clear Title + Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-bold text-[#483878] dark:text-slate-100">
          حركة الحافلات
        </h2>

        {enableDashboardFeatures && trips.length > 0 && (
          <div className="flex items-center gap-2" role="group" aria-label="تصفية حالة الحافلات">
            {filterChips.map((chip) => {
              const isActive = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setOperationTypeFilter('all');
                    setStatusFilter(chip.id);
                  }}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#483878] text-white shadow-2xs'
                      : 'bg-[#F7FBFE] dark:bg-slate-800 text-[#444444] dark:text-slate-300 border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lanes Content */}
      <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pl-0.5">
        {trips.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/60 border border-[#A9DDF5]/70 dark:border-slate-700">
            <div className="flex items-center gap-2.5 text-[13px] font-semibold text-[#444444] dark:text-slate-300">
              <Bus className="w-4 h-4 text-[#4A9FD8] shrink-0" aria-hidden="true" />
              <span>لا توجد رحلات مجدولة للعرض حالياً</span>
            </div>
            {onOpenImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] text-white text-[13px] font-bold cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>استيراد جدول</span>
              </button>
            )}
          </div>
        ) : displayTrips.length === 0 ? (
          <div className="flex items-center gap-2.5 py-3 px-4 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/60 border border-[#A9DDF5]/70 dark:border-slate-700 text-[13px] font-semibold text-[#444444] dark:text-slate-300">
            <Bus className="w-4 h-4 text-[#4A9FD8] shrink-0" aria-hidden="true" />
            <span>لا توجد حافلات مطابقة للتصفية الحالية</span>
          </div>
        ) : (
          displayTrips.map((trip) => {
            const progressPercent = Math.max(0, Math.min(100, Math.round(trip.progress * 100)));
            const shortDriver = formatShortDriverName(trip.driverName);
            const delayMinutes = computeTripDelayMinutes(trip, currentTime);
            const isConflict =
              trip.status === 'conflict' || (trip.conflicts && trip.conflicts.length > 0);
            const isCompleted =
              trip.status === 'completed_actual' || trip.status === 'completed_scheduled';
            const isUpcoming = trip.status === 'scheduled_upcoming';
            const isActiveTrip =
              trip.status === 'in_progress_scheduled' || trip.status === 'started_actual';
            const elapsedSinceDepMs =
              currentTime.getTime() - new Date(trip.departureDateTime).getTime();
            const isJustStarted =
              isActiveTrip && elapsedSinceDepMs >= 0 && elapsedSinceDepMs <= 5 * 60 * 1000;

            const routeLabel = `${trip.origin} ← ${trip.destination}`;

            // Strict status color separation (Green #22A06B, Amber #E5A100, Red #D92D20)
            let statusColor = '#22A06B';
            let statusChipClasses =
              'bg-[#22A06B]/12 text-[#166534] dark:text-emerald-300 border border-[#22A06B]/30';
            let statusLabel = isCompleted
              ? 'مكتملة'
              : isUpcoming
              ? 'قادمة'
              : isJustStarted
              ? 'بدأت الآن'
              : 'في الموعد';

            if (delayMinutes >= 15 || isConflict) {
              statusColor = '#D92D20';
              statusChipClasses =
                'bg-[#D92D20]/12 text-[#B42318] dark:text-red-300 border border-[#D92D20]/35';
              statusLabel = delayMinutes > 0 ? `متأخرة ${delayMinutes} د` : 'تعارض';
            } else if (delayMinutes > 0) {
              statusColor = '#E5A100';
              statusChipClasses =
                'bg-[#E5A100]/15 text-[#92400E] dark:text-[#FDE68A] border border-[#E5A100]/45';
              statusLabel = `متأخرة ${delayMinutes} د`;
            }

            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelectTrip && onSelectTrip(trip)}
                className="w-full text-right p-4 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-[#A9DDF5]/80 dark:border-slate-700 hover:border-[#4A9FD8] transition-colors flex flex-col gap-3 cursor-pointer"
              >
                {/* Line 1: Navy Bus Badge + Route + Status Chip */}
                <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#483878] text-white font-mono text-[13px] font-bold shrink-0">
                      {trip.busId || '—'}
                    </span>
                    <span
                      className="text-[14px] font-bold text-[#483878] dark:text-slate-100 truncate min-w-0"
                      title={routeLabel}
                    >
                      {routeLabel}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold shrink-0 whitespace-nowrap ${statusChipClasses}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Line 2: Driver + Bold Time Range + Thin 8px Progress Bar with Bus Icon + Percentage */}
                <div className="flex items-center gap-3 min-w-0 w-full">
                  <span
                    className="text-[13px] font-medium text-[#444444] dark:text-slate-300 truncate max-w-[130px] shrink-0"
                    title={trip.driverName}
                  >
                    {shortDriver}
                  </span>

                  <span
                    dir="ltr"
                    className="font-mono tabular-nums text-[13px] font-bold text-[#483878] dark:text-slate-200 whitespace-nowrap shrink-0"
                  >
                    {trip.departureTime} – {trip.arrivalTime}
                  </span>

                  {/* 8px Thin Progress Bar with Small Animated Bus Icon */}
                  <div className="relative flex-1 min-w-[80px] h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: statusColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                    />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 flex items-center justify-center shadow-xs pointer-events-none"
                      style={{ borderColor: statusColor }}
                      initial={{ right: '0%' }}
                      animate={{ right: `${progressPercent}%` }}
                      transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                      aria-hidden="true"
                    >
                      <Bus className="w-3 h-3" style={{ color: statusColor }} />
                    </motion.div>
                  </div>

                  <span className="font-mono tabular-nums text-[13px] font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap shrink-0">
                    {progressPercent}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};
