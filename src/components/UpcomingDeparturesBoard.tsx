import React, { useMemo, useState } from 'react';
import { Clock, AlertCircle, History, ChevronDown, ChevronUp, Bus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Trip } from '../types';
import { DEPARTURE_LIFECYCLE_CONFIG } from '../config/departuresConfig';
import { hasTripDeparted, isTripUnassigned } from '../services/scheduleEngine';

interface UpcomingDeparturesBoardProps {
  trips: Trip[];
  currentTime: Date;
  onSelectTrip?: (trip: Trip) => void;
  maxRows?: number;
  isTVMode?: boolean;
}

function formatCountdownMMSS(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const UpcomingDeparturesBoard: React.FC<UpcomingDeparturesBoardProps> = ({
  trips,
  currentTime,
  onSelectTrip,
  maxRows = DEPARTURE_LIFECYCLE_CONFIG.MAX_VISIBLE_ROWS,
}) => {
  const [showRecentlyDeparted, setShowRecentlyDeparted] = useState(false);

  const currentMs = currentTime.getTime();
  const nearWindowMs = DEPARTURE_LIFECYCLE_CONFIG.NEAR_WINDOW_MINUTES * 60000;
  const graceWindowMs = DEPARTURE_LIFECYCLE_CONFIG.DEPARTURE_GRACE_MINUTES * 60000;

  // Upcoming trips active within the 4-stage automatic lifecycle (8-10 visible rows with scroll)
  const upcomingTrips = useMemo(() => {
    return trips
      .filter((t) => {
        if (t.status === 'cancelled' || t.actualStatus === 'cancelled') return false;
        if (t.status === 'completed_actual' || t.status === 'completed_scheduled') return false;
        const depMs = new Date(t.departureDateTime).getTime();
        if (Number.isNaN(depMs)) return false;
        return currentMs < depMs + graceWindowMs;
      })
      .sort((a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime())
      .slice(0, maxRows);
  }, [trips, currentMs, graceWindowMs, maxRows]);

  // Last 5 departed trips for the "انطلقت مؤخراً" log
  const recentlyDepartedTrips = useMemo(() => {
    return trips
      .filter((t) => {
        if (t.status === 'cancelled' || t.actualStatus === 'cancelled') return false;
        return hasTripDeparted(t);
      })
      .sort((a, b) => new Date(b.departureDateTime).getTime() - new Date(a.departureDateTime).getTime())
      .slice(0, DEPARTURE_LIFECYCLE_CONFIG.RECENTLY_DEPARTED_LIMIT);
  }, [trips]);

  return (
    <div className="w-full h-full bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm relative select-none flex flex-col justify-between">
      {/* Box Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#483878] dark:text-slate-100">
            الرحلات القادمة
          </h2>
        </div>

        <span className="text-xs sm:text-sm font-mono font-bold text-[#483878] dark:text-[#A9DDF5] bg-[#EEF2F7] dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-[#CBD5E1] dark:border-slate-700">
          {upcomingTrips.length} رحلات
        </span>
      </div>

      {/* Table Content with smooth vertical internal scrolling */}
      <div className="overflow-x-auto overflow-y-auto max-h-[450px] flex-1 pr-0.5">
        <table className="w-full text-right text-sm sm:text-[15px] border-collapse">
          <thead className="sticky top-0 z-10 bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-xs">
            <tr className="border-b border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-slate-200 text-xs sm:text-sm font-bold">
              <th className="py-3 px-2.5">رقم الرحلة</th>
              <th className="py-3 px-2.5">رقم الحافلة</th>
              <th className="py-3 px-2.5">الوجهة</th>
              <th className="py-3 px-2.5 text-center">وقت المغادرة</th>
              <th className="py-3 px-2.5 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#A9DDF5]/40 dark:divide-slate-700/70">
            {upcomingTrips.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-[#444444] dark:text-slate-300 text-sm font-medium"
                >
                  لا توجد رحلات قادمة مسجلة حالياً
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {upcomingTrips.map((trip) => {
                  const depMs = new Date(trip.departureDateTime).getTime();
                  const diffMs = depMs - currentMs;
                  const isDueNow = diffMs <= 0;
                  const isNear = diffMs > 0 && diffMs <= nearWindowMs;
                  const departed = hasTripDeparted(trip);
                  const unassignedNear =
                    (isNear || isDueNow) && !departed && isTripUnassigned(trip);

                  let rowStyle =
                    'hover:bg-[#EEF7FC] dark:hover:bg-slate-800/80 transition-colors cursor-pointer';
                  let badgeStyle =
                    'bg-[#EEF2F7] dark:bg-slate-800 text-[#334155] dark:text-slate-200 border-[#CBD5E1] dark:border-slate-600 font-bold';
                  let badgeText = '';

                  if (isDueNow) {
                    // Phase 3: حان وقت الانطلاق (light blue background, blue border, soft pulse)
                    rowStyle =
                      'bg-[#4A9FD8]/15 dark:bg-[#4A9FD8]/20 ring-1 ring-inset ring-[#2E7CF6]/70 hover:bg-[#4A9FD8]/22 cursor-pointer transition-colors';
                    badgeStyle =
                      'bg-[#2E7CF6]/15 text-[#2E7CF6] dark:text-[#60A5FA] border-[#2E7CF6]/50 font-black animate-pulse';
                    badgeText = departed ? 'حان وقت الانطلاق · انطلقت' : 'حان وقت الانطلاق';
                  } else if (isNear) {
                    // Phase 2: قريبة (last 30 min -> light yellow bg + live MM:SS countdown)
                    rowStyle =
                      'bg-[#E5A100]/12 dark:bg-[#E5A100]/15 hover:bg-[#E5A100]/18 dark:hover:bg-[#E5A100]/22 cursor-pointer transition-colors';
                    badgeStyle =
                      'bg-[#E5A100]/18 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/50 font-mono tabular-nums font-black';
                    badgeText = formatCountdownMMSS(diffMs);
                  } else {
                    // Phase 1: قادمة (> 30 min -> cool blue-gray badge: light background + dark text)
                    const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000));
                    badgeStyle =
                      'bg-[#EEF2F7] dark:bg-slate-800/90 text-[#334155] dark:text-slate-200 border-[#CBD5E1] dark:border-slate-600 font-bold';
                    badgeText = `تنطلق بعد ${totalMinutes} دقيقة`;
                  }

                  return (
                    <motion.tr
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -28 }}
                      transition={{
                        duration: DEPARTURE_LIFECYCLE_CONFIG.EXIT_ANIMATION_SECONDS,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => onSelectTrip && onSelectTrip(trip)}
                      className={rowStyle}
                    >
                      <td className="py-3.5 px-2.5 font-mono font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isDueNow && (
                            <span className="w-2 h-2 rounded-full bg-[#2E7CF6] animate-ping shrink-0" />
                          )}
                          <span>{trip.tripNumber}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 font-mono font-semibold text-[#4A9FD8] dark:text-[#A9DDF5] whitespace-nowrap">
                        {trip.busId && trip.busId !== 'غير محدد' ? (
                          trip.busId
                        ) : (
                          <span className="text-[#D92D20] dark:text-red-300 font-bold">
                            غير محدد
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3.5 px-2.5 text-[#444444] dark:text-slate-200 font-semibold whitespace-nowrap max-w-[140px] truncate"
                        title={trip.destination}
                      >
                        {trip.destination}
                      </td>
                      <td className="py-3.5 px-2.5 text-center font-mono tabular-nums font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                        {trip.departureTime}
                      </td>
                      <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs sm:text-[13px] border ${badgeStyle}`}
                          >
                            {badgeText}
                          </span>
                          {unassignedNear && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#D92D20]/12 text-[#D92D20] dark:text-red-300 border border-[#D92D20]/40"
                              title="الرحلة تقترب من الإقلاع بدون حافلة أو سائق مسندين"
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>غير مسندة</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: Recently Departed Log ("انطلقت مؤخراً") */}
      <div className="pt-3 mt-2 border-t border-[#A9DDF5]/50 dark:border-slate-700/80 shrink-0">
        <button
          type="button"
          onClick={() => setShowRecentlyDeparted((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-[#483878] dark:text-[#A9DDF5] hover:text-[#2E7CF6] transition-colors cursor-pointer py-1 px-1 rounded-lg"
        >
          <span className="inline-flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#22A06B]" />
            <span>انطلقت مؤخراً</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/30">
              {recentlyDepartedTrips.length}
            </span>
          </span>
          {showRecentlyDeparted ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {showRecentlyDeparted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto">
                {recentlyDepartedTrips.length === 0 ? (
                  <p className="text-xs text-center text-[#444444] dark:text-slate-400 py-3 bg-[#F7FBFE] dark:bg-slate-800/60 rounded-xl border border-[#A9DDF5]/50 dark:border-slate-700">
                    لا توجد رحلات منطلقة مسجلة مؤخراً
                  </p>
                ) : (
                  recentlyDepartedTrips.map((trip) => (
                    <button
                      type="button"
                      key={trip.id}
                      onClick={() => onSelectTrip && onSelectTrip(trip)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 border border-[#A9DDF5]/60 dark:border-slate-700 text-right text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-black text-[#483878] dark:text-slate-100 shrink-0">
                          {trip.tripNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#4A9FD8] shrink-0">
                          <Bus className="w-3 h-3" />
                          {trip.busId}
                        </span>
                        <span className="text-[#444444] dark:text-slate-300 truncate">
                          {trip.destination}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#22A06B] bg-[#22A06B]/10 border border-[#22A06B]/30 px-2 py-0.5 rounded-full shrink-0">
                        {trip.actualDepartureTime || trip.departureTime}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
