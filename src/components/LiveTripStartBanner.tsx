import React, { useMemo } from 'react';
import { Bus, Users, Navigation, ArrowLeft, X, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Trip } from '../types';
import { formatShortDriverName } from '../services/dateTimeUtils';

interface LiveTripStartBannerProps {
  trips: Trip[];
  currentTime: Date;
  newlyStartedIds: Set<string>;
  dismissedIds: Set<string>;
  onSelectTrip: (trip: Trip) => void;
  onDismissTrip: (tripId: string) => void;
}

const LAUNCH_WINDOW_MS = 5 * 60 * 1000;

export const LiveTripStartBanner: React.FC<LiveTripStartBannerProps> = ({
  trips,
  currentTime,
  newlyStartedIds,
  dismissedIds,
  onSelectTrip,
  onDismissTrip,
}) => {
  const currentMs = currentTime.getTime();

  const startedTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        if (dismissedIds.has(trip.id)) return false;
        if (trip.status === 'cancelled' || trip.actualStatus === 'cancelled') return false;
        const isActive =
          trip.status === 'in_progress_scheduled' || trip.status === 'started_actual';
        if (!isActive) return false;

        const depMs = new Date(trip.departureDateTime).getTime();
        const elapsedMs = currentMs - depMs;
        const inRecentWindow = elapsedMs >= 0 && elapsedMs <= LAUNCH_WINDOW_MS;
        return inRecentWindow || newlyStartedIds.has(trip.id);
      })
      .sort(
        (a, b) =>
          new Date(b.departureDateTime).getTime() - new Date(a.departureDateTime).getTime()
      );
  }, [trips, currentMs, newlyStartedIds, dismissedIds]);

  if (startedTrips.length === 0) return null;

  return (
    <section
      aria-live="polite"
      aria-label="إشعارات بدء الرحلات المباشرة"
      className="space-y-2.5"
    >
      <AnimatePresence initial={false}>
        {startedTrips.map((trip) => {
          const depMs = new Date(trip.departureDateTime).getTime();
          const elapsedSec = Math.max(0, Math.floor((currentMs - depMs) / 1000));
          const elapsedMin = Math.floor(elapsedSec / 60);
          const timingLabel =
            elapsedMin === 0 ? 'بدأت للتو' : `بدأت منذ ${elapsedMin} دقيقة`;
          const progressPercent = Math.round(trip.progress * 100);

          return (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: -12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-2xl bg-white dark:bg-[#131C31] border border-[#22A06B] dark:border-emerald-500/60 p-3.5 sm:p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3"
            >
              {/* Live Launch Info */}
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#22A06B] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Play className="w-4 h-4 fill-current" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-black text-[#22A06B] dark:text-emerald-400">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22A06B] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22A06B]" />
                      </span>
                      <span>بدأت الرحلة الآن</span>
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="font-mono font-black text-sm text-[#483878] dark:text-white">
                      رحلة {trip.tripNumber}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[#4A9FD8]">
                      انطلقت {trip.departureTime} ({timingLabel})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#444444] dark:text-slate-300 font-semibold">
                    <span className="inline-flex items-center gap-1 font-bold text-[#483878] dark:text-slate-100">
                      <Navigation className="w-3.5 h-3.5 text-[#E8742A] shrink-0" />
                      <span>
                        {trip.origin} ← {trip.destination}
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[#483878] dark:text-[#A9DDF5]">
                      <Bus className="w-3.5 h-3.5 text-[#4A9FD8] shrink-0" />
                      <span>{trip.busId}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>الكابتن: {formatShortDriverName(trip.driverName)}</span>
                    {trip.passengerCount !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold">
                          <Users className="w-3.5 h-3.5 text-[#4A9FD8]" />
                          <span>{trip.passengerCount} راكب</span>
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums font-bold text-[#22A06B] dark:text-emerald-400">
                      التقدم {progressPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Controls */}
              <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => onSelectTrip(trip)}
                  className="min-h-10 px-4 py-2 rounded-xl bg-[#483878] hover:bg-[#3a2c63] text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                >
                  <span>متابعة الحافلة والركاب</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onDismissTrip(trip.id)}
                  aria-label={`إخفاء إشعار بدء رحلة ${trip.tripNumber}`}
                  className="min-w-10 min-h-10 p-2 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 text-[#444444] dark:text-slate-300 border border-[#A9DDF5] dark:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
};
