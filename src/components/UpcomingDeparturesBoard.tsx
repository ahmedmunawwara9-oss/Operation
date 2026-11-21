import React, { useMemo, useState } from 'react';
import { Clock, AlertCircle, AlertTriangle, History, ChevronDown, ChevronUp, Bus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Trip } from '../types';
import { DEPARTURE_LIFECYCLE_CONFIG } from '../config/departuresConfig';
import {
  hasTripDeparted,
  isTripForOperationalDate,
  isTripUnassigned,
  isTripUpcoming,
} from '../services/scheduleEngine';

interface UpcomingDeparturesBoardProps {
  trips: Trip[];
  currentTime: Date;
  onSelectTrip?: (trip: Trip) => void;
  maxRows?: number;
  isTVMode?: boolean;
  operationalDate?: string;
  timeZone?: string;
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
  isTVMode,
  operationalDate,
  timeZone,
}) => {
  void isTVMode;

  const [showRecentlyDeparted, setShowRecentlyDeparted] = useState(false);

  const currentMs = currentTime.getTime();
  const nearWindowMs = DEPARTURE_LIFECYCLE_CONFIG.NEAR_WINDOW_MINUTES * 60000;

  // Upcoming trips active within the 4-stage automatic lifecycle (unified with KPI "قادمة")
  const allUpcomingTrips = useMemo(() => {
    return trips
      .filter(
        (t) =>
          (!operationalDate || isTripForOperationalDate(t, operationalDate, timeZone)) &&
          isTripUpcoming(t, currentTime)
      )
      .sort((a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime());
  }, [trips, currentTime, operationalDate, timeZone]);

  const upcomingTrips = useMemo(() => {
    return allUpcomingTrips.slice(0, maxRows);
  }, [allUpcomingTrips, maxRows]);

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
    <section className="w-full card-white rounded-2xl p-4 sm:p-5 select-none flex flex-col gap-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-[#483878] dark:text-slate-100">
          الرحلات القادمة
        </h2>
        <span className="text-[13px] font-mono font-bold text-[#483878] dark:text-[#A9DDF5] bg-[#EEF2F7] dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-[#CBD5E1] dark:border-slate-700">
          {allUpcomingTrips.length}
        </span>
      </div>

      {/* Compact Empty State or Clean List */}
      {upcomingTrips.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-[13px] font-medium text-[#444444] dark:text-slate-300">
          <Clock className="w-4 h-4 text-[#4A9FD8] shrink-0" aria-hidden="true" />
          <span>لا توجد رحلات قادمة حالياً</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pl-0.5">
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
                'bg-[#F7FBFE] dark:bg-slate-800/70 border-[#A9DDF5]/80 dark:border-slate-700 hover:border-[#4A9FD8]';
              let badgeStyle =
                'bg-[#EEF2F7] dark:bg-slate-800 text-[#334155] dark:text-slate-200 border-[#CBD5E1] dark:border-slate-600 font-bold';
              let badgeText = '';

              if (isDueNow) {
                rowStyle =
                  'bg-[#4A9FD8]/12 dark:bg-[#4A9FD8]/20 border-[#2E7CF6]/70';
                badgeStyle =
                  'bg-[#2E7CF6]/15 text-[#1D4ED8] dark:text-[#93C5FD] border-[#2E7CF6]/45 font-bold';
                badgeText = departed ? 'انطلقت الآن' : 'حان وقت الانطلاق';
              } else if (isNear) {
                rowStyle =
                  'bg-[#E5A100]/10 dark:bg-[#E5A100]/15 border-[#E5A100]/45';
                badgeStyle =
                  'bg-[#E5A100]/18 text-[#92400E] dark:text-[#FDE68A] border-[#E5A100]/45 font-mono tabular-nums font-bold';
                badgeText = formatCountdownMMSS(diffMs);
              } else {
                const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000));
                badgeStyle =
                  'bg-[#EEF2F7] dark:bg-slate-800 text-[#334155] dark:text-slate-200 border-[#CBD5E1] dark:border-slate-600 font-bold';
                badgeText = `بعد ${totalMinutes} د`;
              }

              const hasBus = Boolean(trip.busId && trip.busId !== 'غير محدد');

              return (
                <motion.button
                  type="button"
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: DEPARTURE_LIFECYCLE_CONFIG.EXIT_ANIMATION_SECONDS,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onClick={() => onSelectTrip && onSelectTrip(trip)}
                  className={`w-full text-right p-3 rounded-xl border transition-colors cursor-pointer flex flex-col gap-1.5 ${rowStyle}`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[13px] font-bold text-[#483878] dark:text-slate-100 shrink-0">
                        {hasBus ? trip.busId : 'غير محدد'}
                      </span>
                      <span
                        className="text-[13px] font-semibold text-[#444444] dark:text-slate-200 truncate"
                        title={trip.destination}
                      >
                        {trip.destination}
                      </span>
                    </div>

                    <span className="font-mono tabular-nums text-[13px] font-bold text-[#483878] dark:text-slate-100 shrink-0">
                      {trip.departureTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[12px] border ${badgeStyle}`}>
                      {badgeText}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {trip.conflicts && trip.conflicts.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold bg-[#D92D20]/10 text-[#B42318] dark:text-red-300 border border-[#D92D20]/30"
                          title="يوجد تعارض مجدول في هذه الرحلة"
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>تعارض</span>
                        </span>
                      )}

                      {unassignedNear && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold bg-[#D92D20]/12 text-[#B42318] dark:text-red-300 border border-[#D92D20]/35"
                          title="الرحلة تقترب من الإقلاع بدون حافلة أو سائق مسندين"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>غير مسندة</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer: Recently Departed Log ("انطلقت مؤخراً") */}
      {recentlyDepartedTrips.length > 0 && (
        <div className="pt-3 border-t border-[#A9DDF5]/50 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setShowRecentlyDeparted((prev) => !prev)}
            className="w-full flex items-center justify-between text-[13px] font-bold text-[#483878] dark:text-[#A9DDF5] hover:text-[#2E7CF6] transition-colors cursor-pointer py-1 rounded-lg"
          >
            <span className="inline-flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#22A06B]" />
              <span>انطلقت مؤخراً</span>
              <span className="px-2 py-0.5 rounded-full text-[12px] font-mono bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/30">
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
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {recentlyDepartedTrips.map((trip) => (
                    <button
                      type="button"
                      key={trip.id}
                      onClick={() => onSelectTrip && onSelectTrip(trip)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 border border-[#A9DDF5]/60 dark:border-slate-700 text-right text-[13px] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[#483878] dark:text-slate-100 shrink-0">
                          <Bus className="w-3.5 h-3.5 text-[#4A9FD8]" />
                          {trip.busId}
                        </span>
                        <span className="text-[#444444] dark:text-slate-300 truncate" title={trip.destination}>
                          {trip.destination}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#22A06B] text-[12px] shrink-0">
                        {trip.actualDepartureTime || trip.departureTime}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
