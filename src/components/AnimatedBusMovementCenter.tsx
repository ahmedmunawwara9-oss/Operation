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

            // Strict status color separation: Green (#22A06B) on-time dot, Orange (#E8742A) near-delay, Red (#D92D20) delayed/conflict
            const isMajorDelay = delayMinutes >= 15 || isConflict;
            const isNearDelay = !isMajorDelay && delayMinutes > 0;
            const isDelayedException = isMajorDelay || isNearDelay;

            let statusColor = '#22A06B';
            let statusChipClasses = '';
            let statusLabel = '';

            if (isMajorDelay) {
              statusColor = '#D92D20';
              statusChipClasses =
                'bg-[#D92D20]/12 text-[#B42318] dark:text-red-300 border border-[#D92D20]/35';
              statusLabel = delayMinutes > 0 ? `متأخرة ${delayMinutes} د` : 'متأخرة';
            } else if (isNearDelay) {
              statusColor = '#E8742A';
              statusChipClasses =
                'bg-[#E8742A]/12 text-[#C2410C] dark:text-orange-300 border border-[#E8742A]/40';
              statusLabel = `قريبة من التأخر (${delayMinutes} د)`;
            }

            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelectTrip && onSelectTrip(trip)}
                className="w-full text-right px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-[#A9DDF5]/80 dark:border-slate-700 hover:border-[#4A9FD8] transition-colors flex flex-col gap-1 sm:gap-1.5 cursor-pointer"
              >
                {/* Line 1: Navy Bus Badge + On-Time Green Dot (when on time) + Route + Exceptional Status Chip */}
                <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#483878] text-white font-mono text-[13px] font-bold shrink-0">
                      {trip.busId || '—'}
                    </span>
                    {!isDelayedException && (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-[#22A06B] shrink-0 ring-2 ring-[#22A06B]/20"
                        title="في الموعد"
                        aria-label="في الموعد"
                      />
                    )}
                    <span
                      className="text-[14px] font-bold text-[#483878] dark:text-slate-100 truncate min-w-0"
                      title={routeLabel}
                    >
                      {routeLabel}
                    </span>
                  </div>

                  {isDelayedException && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[13px] font-bold shrink-0 whitespace-nowrap ${statusChipClasses}`}
                    >
                      {statusLabel}
                    </span>
                  )}
                </div>

                {/* Line 2: Driver + Bold Time Range + Thin 8px Progress Bar with 96x46 Bus SVG + Percentage */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 min-w-0 w-full">
                  <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0 shrink-0">
                    <span
                      className="text-[14px] font-semibold text-[#1E293B] dark:text-slate-100 truncate max-w-[165px] sm:w-[135px] text-right shrink-0"
                      title={trip.driverName}
                    >
                      {shortDriver}
                    </span>

                    <span
                      dir="ltr"
                      className="font-mono tabular-nums text-[14px] sm:text-[15px] font-bold text-[#2E2252] dark:text-slate-100 whitespace-nowrap shrink-0"
                    >
                      {trip.departureTime} – {trip.arrivalTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 flex-1 min-w-0 w-full py-3">
                    {/* 8px Thin Progress Bar with Animated 96x46 Side-View Bus SVG */}
                    <div className="relative flex-1 min-w-[80px] h-2 rounded-full bg-slate-200 dark:bg-slate-700 ms-8 me-2 sm:mx-9">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: statusColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                      />
                      <motion.div
                        className="absolute top-1/2 pointer-events-none"
                        style={{
                          transform: 'translate(-50%, -50%)',
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.25))',
                        }}
                        initial={{ left: '100%' }}
                        animate={{ left: `${100 - progressPercent}%` }}
                        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 120 56"
                          width={96}
                          height={46}
                          xmlns="http://www.w3.org/2000/svg"
                          className="block"
                        >
                          <path
                            d="M 14 3 H 110 Q 116 3 116 9 V 37 Q 116 43 110 43 H 10 Q 4 43 4 37 V 17.5 Q 5 5 14 3 Z"
                            fill="#1fa36b"
                          />
                          <path
                            d="M 16 4.5 H 108"
                            stroke="#4fd199"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            opacity="0.55"
                          />
                          <path
                            d="M 7.5 17 Q 8.5 8 15.5 7 H 22 V 17.5 H 7.5 Z"
                            fill="#dff3ff"
                          />
                          <g fill="#dff3ff">
                            <rect x="25.5" y="7" width="14" height="9" rx="2" />
                            <rect x="42.5" y="7" width="14" height="9" rx="2" />
                            <rect x="59.5" y="7" width="14" height="9" rx="2" />
                            <rect x="76.5" y="7" width="14" height="9" rx="2" />
                            <rect x="93.5" y="7" width="15.5" height="9" rx="2" />
                          </g>
                          <text
                            x="64"
                            y="30"
                            textAnchor="middle"
                            fontFamily="Tajawal, Cairo, sans-serif"
                            fontSize="13.5"
                            fontWeight="800"
                            fill="#ffffff"
                          >
                            درة المنورة
                          </text>
                          <text
                            x="64"
                            y="40.5"
                            textAnchor="middle"
                            fontFamily="Arial, sans-serif"
                            fontSize="9.5"
                            fontWeight="800"
                            letterSpacing="1.8"
                            fill="#ffffff"
                          >
                            DMTC
                          </text>
                          <rect x="2" y="29" width="4.5" height="5" rx="1.2" fill="#ffd54a" />
                          <rect x="114.5" y="29" width="2.5" height="5" rx="1" fill="#ff7675" />
                          <circle cx="28" cy="43.5" r="8.2" fill="#157a4f" />
                          <circle cx="92" cy="43.5" r="8.2" fill="#157a4f" />
                          <circle cx="28" cy="44.5" r="7" fill="#2b2b2b" />
                          <circle cx="28" cy="44.5" r="3" fill="#cfd8dc" />
                          <circle cx="92" cy="44.5" r="7" fill="#2b2b2b" />
                          <circle cx="92" cy="44.5" r="3" fill="#cfd8dc" />
                        </svg>
                      </motion.div>
                    </div>

                    <span className="font-mono tabular-nums text-[15px] font-extrabold text-[#2E2252] dark:text-white whitespace-nowrap shrink-0">
                      {progressPercent}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};
