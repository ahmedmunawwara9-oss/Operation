import React, { useEffect, useMemo, useState } from 'react';
import {
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Bus,
  ArrowUpDown,
} from 'lucide-react';
import { Trip } from '../types';
import {
  TripHoverTooltip,
  HoveredTripState,
  buildHoveredTripState,
} from './TripHoverTooltip';

interface RouteGanttViewProps {
  trips: Trip[];
  currentTime: Date;
  currentTimePercent: number;
  onSelectTrip: (trip: Trip) => void;
}

interface PositionedRouteTrip {
  trip: Trip;
  laneIndex: number;
  leftPercent: number;
  widthPercent: number;
  isOverlappingOnRoute: boolean;
}

interface OverlapBand {
  leftPercent: number;
  widthPercent: number;
  concurrentCount: number;
}

interface RouteGroup {
  routeName: string;
  trips: Trip[];
  positionedTrips: PositionedRouteTrip[];
  laneCount: number;
  maxConcurrent: number;
  overlappingTripsCount: number;
  overlapBands: OverlapBand[];
  uniqueBusesCount: number;
}

function resolveRouteName(trip: Trip): string {
  const explicitRoute = (trip.route || '').trim();
  if (explicitRoute) return explicitRoute;
  const origin = (trip.origin || '').trim() || 'نقطة الانطلاق';
  const destination = (trip.destination || '').trim() || 'الوجهة';
  return `${origin} ← ${destination}`;
}

function getTripMinutesSpan(trip: Trip): { startMin: number; endMin: number } {
  const [dHour, dMin] = (trip.departureTime || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  const [aHour, aMin] = (trip.arrivalTime || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  const startMin = dHour * 60 + dMin;
  let endMin = aHour * 60 + aMin;
  if (trip.isOvernight || endMin <= startMin) {
    endMin += 1440;
  }
  return { startMin, endMin: Math.max(startMin + 15, endMin) };
}

function analyzeRouteGroup(routeName: string, routeTrips: Trip[]): RouteGroup {
  const sorted = [...routeTrips].sort((a, b) => {
    const spanA = getTripMinutesSpan(a);
    const spanB = getTripMinutesSpan(b);
    if (spanA.startMin !== spanB.startMin) return spanA.startMin - spanB.startMin;
    return spanA.endMin - spanB.endMin;
  });

  // 1. Detect real timestamp overlaps among trips on the same route
  const overlappingTripIds = new Set<string>();
  const timestampItems = sorted.map((t) => {
    const depMs = new Date(t.departureDateTime).getTime();
    const arrMs = new Date(t.arrivalDateTime).getTime();
    const span = getTripMinutesSpan(t);
    return {
      trip: t,
      depMs: isNaN(depMs) ? span.startMin * 60000 : depMs,
      arrMs: isNaN(arrMs) ? span.endMin * 60000 : Math.max(depMs + 60000, arrMs),
      startMin: span.startMin,
      endMin: span.endMin,
    };
  });

  for (let i = 0; i < timestampItems.length; i++) {
    for (let j = i + 1; j < timestampItems.length; j++) {
      const a = timestampItems[i];
      const b = timestampItems[j];
      if (a.depMs < b.arrMs && a.arrMs > b.depMs) {
        overlappingTripIds.add(a.trip.id);
        overlappingTripIds.add(b.trip.id);
      }
    }
  }

  // 2. Sweep-line for max concurrency and visual overlap bands (clamped to 24h axis)
  const sweepEvents: Array<{ ms: number; delta: number; minOnAxis: number }> = [];
  for (const item of timestampItems) {
    const clampedStart = Math.min(1440, Math.max(0, item.startMin));
    const clampedEnd = Math.min(1440, Math.max(clampedStart + 1, item.endMin));
    sweepEvents.push({ ms: item.depMs, delta: 1, minOnAxis: clampedStart });
    sweepEvents.push({ ms: item.arrMs, delta: -1, minOnAxis: clampedEnd });
  }
  sweepEvents.sort((a, b) => (a.ms !== b.ms ? a.ms - b.ms : a.delta - b.delta));

  let active = 0;
  let maxConcurrent = sorted.length > 0 ? 1 : 0;
  const rawOverlapSegments: Array<{ startMin: number; endMin: number; count: number }> = [];
  let currentOverlapStartMin: number | null = null;
  let currentOverlapPeak = 0;

  for (const ev of sweepEvents) {
    const prevActive = active;
    active += ev.delta;
    if (active > maxConcurrent) maxConcurrent = active;

    if (prevActive < 2 && active >= 2) {
      currentOverlapStartMin = ev.minOnAxis;
      currentOverlapPeak = active;
    } else if (active >= 2 && currentOverlapStartMin !== null) {
      currentOverlapPeak = Math.max(currentOverlapPeak, active);
    } else if (prevActive >= 2 && active < 2 && currentOverlapStartMin !== null) {
      if (ev.minOnAxis > currentOverlapStartMin) {
        rawOverlapSegments.push({
          startMin: currentOverlapStartMin,
          endMin: ev.minOnAxis,
          count: currentOverlapPeak,
        });
      }
      currentOverlapStartMin = null;
      currentOverlapPeak = 0;
    }
  }

  // Fallback overlap bands by 24h minute span if trips on same route have same time across dates
  const overlapBands: OverlapBand[] = rawOverlapSegments.map((seg) => {
    const leftPercent = Math.min(99, Math.max(0, (seg.startMin / 1440) * 100));
    const widthPercent = Math.min(
      100 - leftPercent,
      Math.max(0.8, ((seg.endMin - seg.startMin) / 1440) * 100)
    );
    return { leftPercent, widthPercent, concurrentCount: seg.count };
  });

  // 3. Multi-lane packing so bars on the same route never visually hide each other
  const laneEnds: number[] = [];
  const positionedTrips: PositionedRouteTrip[] = sorted.map((trip) => {
    const { startMin, endMin } = getTripMinutesSpan(trip);

    let assignedLane = laneEnds.findIndex((laneEnd) => laneEnd <= startMin);
    if (assignedLane === -1) {
      assignedLane = laneEnds.length;
      laneEnds.push(endMin);
    } else {
      laneEnds[assignedLane] = endMin;
    }

    const durationMin = Math.max(20, endMin - startMin);
    const leftPercent = Math.min(99, Math.max(0, (startMin / 1440) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(2, (durationMin / 1440) * 100));

    return {
      trip,
      laneIndex: assignedLane,
      leftPercent,
      widthPercent,
      isOverlappingOnRoute: overlappingTripIds.has(trip.id),
    };
  });

  const uniqueBusesCount = new Set(routeTrips.map((t) => t.busId).filter(Boolean)).size;

  return {
    routeName,
    trips: sorted,
    positionedTrips,
    laneCount: Math.max(1, laneEnds.length),
    maxConcurrent,
    overlappingTripsCount: overlappingTripIds.size,
    overlapBands,
    uniqueBusesCount,
  };
}

export const RouteGanttView: React.FC<RouteGanttViewProps> = ({
  trips,
  currentTime,
  currentTimePercent,
  onSelectTrip,
}) => {
  const [sortBy, setSortBy] = useState<'overlaps' | 'trips' | 'name'>('overlaps');
  const [onlyOverlapping, setOnlyOverlapping] = useState<boolean>(false);
  const [hoveredTrip, setHoveredTrip] = useState<HoveredTripState | null>(null);

  useEffect(() => {
    if (!hoveredTrip) return;
    const clearTooltip = () => setHoveredTrip(null);
    window.addEventListener('scroll', clearTooltip, true);
    return () => window.removeEventListener('scroll', clearTooltip, true);
  }, [hoveredTrip]);

  const routeGroups = useMemo(() => {
    const byRoute = new Map<string, Trip[]>();
    for (const trip of trips) {
      const routeName = resolveRouteName(trip);
      const list = byRoute.get(routeName) || [];
      list.push(trip);
      byRoute.set(routeName, list);
    }

    const groups = Array.from(byRoute.entries()).map(([routeName, list]) =>
      analyzeRouteGroup(routeName, list)
    );

    groups.sort((a, b) => {
      if (sortBy === 'overlaps') {
        if (b.maxConcurrent !== a.maxConcurrent) return b.maxConcurrent - a.maxConcurrent;
        if (b.overlappingTripsCount !== a.overlappingTripsCount) {
          return b.overlappingTripsCount - a.overlappingTripsCount;
        }
        return b.trips.length - a.trips.length;
      }
      if (sortBy === 'trips') {
        return b.trips.length - a.trips.length;
      }
      return a.routeName.localeCompare(b.routeName, 'ar');
    });

    return groups;
  }, [trips, sortBy]);

  const overlappingRoutesCount = useMemo(
    () => routeGroups.filter((g) => g.maxConcurrent >= 2).length,
    [routeGroups]
  );

  const displayedGroups = useMemo(() => {
    if (!onlyOverlapping) return routeGroups;
    return routeGroups.filter((g) => g.maxConcurrent >= 2);
  }, [routeGroups, onlyOverlapping]);

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="mt-4 space-y-3">
      {/* Route Summary & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-[#483878] dark:text-slate-100">
            <Navigation className="w-4 h-4 text-[#E8742A]" />
            <span>عدد المسارات: {routeGroups.length}</span>
          </div>

          {overlappingRoutesCount > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5A100]/15 dark:bg-amber-950/50 border border-[#E5A100]/40 text-[#9A6B00] dark:text-amber-300 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-[#E5A100]" />
              <span>{overlappingRoutesCount} مسار به رحلات متداخلة زمنياً</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22A06B]/10 dark:bg-emerald-950/50 border border-[#22A06B]/30 text-[#22A06B] dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>لا توجد تداخلات بين الرحلات على نفس المسار</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 font-semibold text-[#444444] dark:text-slate-200 cursor-pointer select-none px-2.5 py-1 rounded-xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700">
            <input
              type="checkbox"
              checked={onlyOverlapping}
              onChange={(e) => setOnlyOverlapping(e.target.checked)}
              className="rounded accent-[#E8742A] cursor-pointer"
            />
            <span>المتداخلة فقط</span>
          </label>

          <div className="flex items-center gap-1.5 bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 rounded-xl px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#4A9FD8]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'overlaps' | 'trips' | 'name')}
              className="bg-transparent text-xs font-bold text-[#483878] dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="overlaps">الأكثر تداخلاً أولاً</option>
              <option value="trips">الأكثر رحلات أولاً</option>
              <option value="name">ترتيب أبجدي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gantt Chart Matrix */}
      <div className="overflow-x-auto">
        <div className="min-w-[980px] relative">
          {/* Time Axis Header */}
          <div className="flex border-b border-[#A9DDF5] dark:border-slate-700 pb-2 text-xs font-mono font-bold text-[#444444] dark:text-slate-300">
            <div className="w-56 shrink-0 pr-2 font-sans font-bold text-[#483878] dark:text-slate-100 text-xs">
              المسار وتداخلاته
            </div>
            <div dir="ltr" className="flex-1 relative flex justify-between">
              {hours
                .filter((h) => h % 2 === 0)
                .map((hour) => (
                  <div key={hour} className="text-center">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
            </div>
          </div>

          {/* Route Swimlanes */}
          <div className="relative py-2 space-y-3">
            {displayedGroups.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#444444] dark:text-slate-300 font-medium">
                {onlyOverlapping
                  ? 'لا توجد مسارات تحتوي على رحلات متداخلة حالياً'
                  : 'لا توجد رحلات مطابقة للمعايير'}
              </div>
            ) : (
              displayedGroups.map((group) => {
                const laneHeightPx = 32;
                const trackHeightPx = group.laneCount * laneHeightPx + 8;
                const hasOverlap = group.maxConcurrent >= 2;

                return (
                  <div
                    key={group.routeName}
                    className={`flex items-stretch rounded-2xl border p-2 transition-colors ${
                      hasOverlap
                        ? 'bg-[#E5A100]/[0.04] dark:bg-amber-950/15 border-[#E5A100]/45 dark:border-amber-700/50'
                        : 'bg-[#F7FBFE]/60 dark:bg-slate-800/40 border-[#A9DDF5] dark:border-slate-700'
                    }`}
                  >
                    {/* Route Metadata Column */}
                    <div className="w-56 shrink-0 pl-3 pr-1 flex flex-col justify-center gap-1.5">
                      <div className="flex items-start gap-1.5">
                        <Navigation
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            hasOverlap ? 'text-[#E8742A]' : 'text-[#4A9FD8]'
                          }`}
                        />
                        <span
                          className="text-xs font-black text-[#483878] dark:text-slate-100 leading-snug line-clamp-2"
                          title={group.routeName}
                        >
                          {group.routeName}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 font-mono font-bold text-[#483878] dark:text-slate-200">
                          {group.trips.length} رحلة
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 font-mono font-semibold text-[#444444] dark:text-slate-300 flex items-center gap-1">
                          <Bus className="w-3 h-3 text-[#4A9FD8]" />
                          {group.uniqueBusesCount}
                        </span>
                        {hasOverlap && (
                          <span className="px-2 py-0.5 rounded-md bg-[#E5A100]/15 dark:bg-amber-950/60 border border-[#E5A100]/50 text-[#9A6B00] dark:text-amber-300 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#E5A100]" />
                            تداخل ×{group.maxConcurrent}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Route Multi-Lane Timeline Track (LTR for exact 00:00 -> 24:00 alignment) */}
                    <div
                      dir="ltr"
                      className="flex-1 bg-white dark:bg-[#131C31] rounded-xl relative overflow-hidden border border-[#A9DDF5] dark:border-slate-700"
                      style={{ minHeight: `${trackHeightPx}px` }}
                    >
                      {/* Vertical 2-hour grid lines */}
                      <div className="absolute inset-0 flex justify-between pointer-events-none opacity-25">
                        {hours
                          .filter((h) => h % 2 === 0)
                          .map((hour) => (
                            <div key={hour} className="w-px h-full bg-[#4A9FD8]" />
                          ))}
                      </div>

                      {/* Highlighted Overlap Windows */}
                      {group.overlapBands.map((band, bIdx) => (
                        <div
                          key={bIdx}
                          className="absolute inset-y-0 bg-[#E5A100]/12 dark:bg-[#E5A100]/15 border-x border-[#E5A100]/45 pointer-events-none"
                          style={{
                            left: `${band.leftPercent}%`,
                            width: `${band.widthPercent}%`,
                          }}
                          title={`منطقة تداخل: ${band.concurrentCount} رحلات متزامنة على هذا المسار`}
                        />
                      ))}

                      {/* Red Moving Current Time Line */}
                      <div
                        className="absolute top-0 bottom-0 z-20 pointer-events-none"
                        style={{ left: `${currentTimePercent}%` }}
                      >
                        <div className="w-0.5 h-full bg-[#D92D20]/85" />
                      </div>

                      {/* Stacked Trip Bars */}
                      {group.positionedTrips.map(({ trip, laneIndex, leftPercent, widthPercent, isOverlappingOnRoute }) => {
                        const hasConflict = trip.conflicts && trip.conflicts.length > 0;

                        let barBg = 'bg-[#4A9FD8] text-white';
                        if (hasConflict) barBg = 'bg-[#D92D20] text-white';
                        else if (trip.status === 'in_progress_scheduled' || trip.status === 'started_actual')
                          barBg = 'bg-[#2E7CF6] text-white';
                        else if (trip.status === 'completed_scheduled' || trip.status === 'completed_actual')
                          barBg = 'bg-[#22A06B] text-white';
                        else if (trip.status === 'needs_confirmation') barBg = 'bg-[#E5A100] text-white';
                        else if (trip.status === 'delayed_confirmed') barBg = 'bg-[#D92D20] text-white';

                        const overlapRing = isOverlappingOnRoute
                          ? 'ring-2 ring-[#F5B13D] dark:ring-amber-300'
                          : '';

                        return (
                          <button
                            type="button"
                            key={trip.id}
                            dir="rtl"
                            onClick={() => {
                              setHoveredTrip(null);
                              onSelectTrip(trip);
                            }}
                            onMouseEnter={(e) =>
                              setHoveredTrip(
                                buildHoveredTripState(e.currentTarget, trip, isOverlappingOnRoute)
                              )
                            }
                            onMouseLeave={() => setHoveredTrip(null)}
                            onFocus={(e) =>
                              setHoveredTrip(
                                buildHoveredTripState(e.currentTarget, trip, isOverlappingOnRoute)
                              )
                            }
                            onBlur={() => setHoveredTrip(null)}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              top: `${laneIndex * laneHeightPx + 4}px`,
                              height: `${laneHeightPx - 6}px`,
                            }}
                            aria-label={`${trip.tripNumber} - حافلة ${trip.busId} - ${trip.driverName}`}
                            className={`absolute rounded-lg px-2 flex items-center justify-between gap-1.5 text-xs font-bold cursor-pointer shadow-sm transition-transform hover:scale-[1.02] hover:z-30 outline-none focus-visible:ring-2 focus-visible:ring-[#483878] ${barBg} ${overlapRing}`}
                          >
                            <span className="truncate font-mono">
                              {trip.tripNumber} · {trip.busId}
                            </span>
                            <span className="font-mono text-xs opacity-95 hidden sm:inline shrink-0">
                              {trip.departureTime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <TripHoverTooltip hovered={hoveredTrip} />
    </div>
  );
};
