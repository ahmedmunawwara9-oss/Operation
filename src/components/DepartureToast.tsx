import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bus, Clock, Navigation, X } from 'lucide-react';
import { Trip } from '../types';

export interface DepartureToastItem {
  id: string;
  trip: Trip;
  triggeredAtMs: number;
}

interface DepartureToastProps {
  toasts: DepartureToastItem[];
  onDismiss: (toastId: string) => void;
  onSelectTrip?: (trip: Trip) => void;
}

export const DepartureToast: React.FC<DepartureToastProps> = ({
  toasts,
  onDismiss,
  onSelectTrip,
}) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-lg pointer-events-none flex flex-col gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => {
          const { trip } = item;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full rounded-2xl bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md border-2 border-[#2E7CF6] shadow-xl p-3.5 flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => onSelectTrip && onSelectTrip(trip)}
                className="flex-1 min-w-0 flex items-center gap-3 text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7CF6] rounded-xl"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2E7CF6]/15 border border-[#2E7CF6]/35 flex items-center justify-center text-[#2E7CF6] shrink-0 relative">
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#2E7CF6] animate-ping" />
                  <Navigation className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#2E7CF6]/15 text-[#2E7CF6] dark:text-[#60A5FA] border border-[#2E7CF6]/35">
                      حان وقت الانطلاق
                    </span>
                    <span className="font-mono font-black text-sm text-[#483878] dark:text-white">
                      {trip.tripNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#4A9FD8] dark:text-[#A9DDF5]">
                      <Bus className="w-3.5 h-3.5 shrink-0" />
                      <span>{trip.busId || 'غير مسندة'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#444444] dark:text-slate-300 font-semibold mt-1 truncate">
                    <span className="truncate">{trip.destination}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-[#2E7CF6] dark:text-[#60A5FA] shrink-0">
                      <Clock className="w-3 h-3" />
                      {trip.departureTime}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="p-1.5 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#4A9FD8]/15 border border-transparent hover:border-[#4A9FD8]/30 transition-colors cursor-pointer shrink-0"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
