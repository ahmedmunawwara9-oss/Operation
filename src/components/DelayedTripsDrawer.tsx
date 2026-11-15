import React from 'react';
import {
  X,
  AlertTriangle,
  Bus,
  User,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Trip } from '../types';
import { formatDuration, formatShortDriverName } from '../services/dateTimeUtils';

interface DelayedTripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  currentTime: Date;
  onSelectTrip: (trip: Trip) => void;
}

export function computeTripDelayMinutes(trip: Trip, currentTime: Date): number {
  if (trip.status === 'completed_actual' || trip.status === 'completed_scheduled' || trip.status === 'cancelled') {
    return 0;
  }
  if (trip.delayMinutes && trip.delayMinutes > 0) {
    return trip.delayMinutes;
  }
  if (trip.status === 'delayed_confirmed') {
    const arrMs = new Date(trip.arrivalDateTime).getTime();
    const diffMin = Math.round((currentTime.getTime() - arrMs) / 60000);
    return Math.max(15, diffMin > 0 ? diffMin : 15);
  }
  if (trip.status === 'needs_confirmation') {
    const arrMs = new Date(trip.arrivalDateTime).getTime();
    return Math.max(1, Math.round((currentTime.getTime() - arrMs) / 60000));
  }
  return 0;
}

export const DelayedTripsDrawer: React.FC<DelayedTripsDrawerProps> = ({
  isOpen,
  onClose,
  trips,
  currentTime,
  onSelectTrip,
}) => {
  if (!isOpen) return null;

  const delayedTrips = trips
    .filter(
      (t) =>
        t.status === 'delayed_confirmed' ||
        t.status === 'needs_confirmation' ||
        (t.delayMinutes && t.delayMinutes > 0 && t.status !== 'completed_actual' && t.status !== 'cancelled')
    )
    .map((t) => ({
      trip: t,
      delayMin: computeTripDelayMinutes(t, currentTime),
    }))
    .sort((a, b) => b.delayMin - a.delayMin);

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#483878]/35 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Side Drawer Panel */}
      <div className="relative z-10 w-full max-w-xl bg-[#F7FBFE] dark:bg-[#0F172A] backdrop-blur-xl border-r border-[#A9DDF5] dark:border-slate-700 shadow-2xl h-full flex flex-col overflow-hidden">
        {/* Top Critical Red Accent Ribbon (Strictly Red #D92D20, NO orange) */}
        <div className="h-1.5 w-full bg-[#D92D20] shrink-0" />

        {/* Drawer Header */}
        <div className="p-5 bg-white dark:bg-[#131C31] border-b border-[#A9DDF5] dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D92D20] flex items-center justify-center text-white shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#483878] dark:text-slate-100">
                  الرحلات المتأخرة وتجاوز الموعد
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-[#D92D20]/10 text-[#D92D20] border border-[#D92D20]/30">
                  {delayedTrips.length}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#444444] dark:text-slate-300 font-medium mt-0.5">
                متابعة الرحلات المتأخرة ومراجعة تفاصيل السائق والحافلة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#A9DDF5]/25 dark:hover:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 transition-colors cursor-pointer"
            aria-label="إغلاق القائمة الجانبية"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {delayedTrips.length === 0 ? (
            <div className="py-16 px-4 text-center bg-white dark:bg-[#131C31] rounded-2xl border border-[#22A06B]/30 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-[#22A06B] mx-auto mb-2.5" />
              <p className="text-sm sm:text-base font-black text-[#483878] dark:text-slate-100">
                لا توجد رحلات متأخرة حالياً
              </p>
              <p className="text-xs sm:text-sm text-[#444444] dark:text-slate-300 mt-1">
                جميع الحافلات تسير وفق الجدول التشغيلي المعتمد
              </p>
            </div>
          ) : (
            delayedTrips.map(({ trip, delayMin }) => {
              const shortDriver = formatShortDriverName(trip.driverName);
              const isSevere = delayMin >= 15;

              return (
                <div
                  key={trip.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-[#131C31] border transition-all shadow-sm ${
                    isSevere
                      ? 'border-[#D92D20]/50 hover:border-[#D92D20]'
                      : 'border-[#E5A100]/60 hover:border-[#E5A100]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#A9DDF5]/40 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-slate-100 font-mono text-xs sm:text-sm font-black border border-[#A9DDF5] dark:border-slate-700">
                        رحلة {trip.tripNumber}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#A9DDF5]/20 dark:bg-slate-800 text-[#483878] dark:text-[#A9DDF5] font-mono text-xs sm:text-sm font-bold border border-[#A9DDF5] dark:border-slate-700 flex items-center gap-1">
                        <Bus className="w-3.5 h-3.5 text-[#4A9FD8]" />
                        <span>{trip.busId || 'غير محدد'}</span>
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-black border flex items-center gap-1.5 ${
                        isSevere
                          ? 'bg-[#D92D20]/10 text-[#D92D20] dark:text-red-300 border-[#D92D20]/30'
                          : 'bg-[#E5A100]/12 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/40'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>تأخير {formatDuration(delayMin, 'ar')}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs sm:text-sm">
                    {/* Driver with short name & full tooltip */}
                    <div className="flex items-center gap-2 text-[#444444] dark:text-slate-300">
                      <User className="w-4 h-4 text-[#4A9FD8] shrink-0" />
                      <span className="font-semibold">السائق:</span>
                      <span
                        className="font-bold text-[#483878] dark:text-slate-100 relative group/drv cursor-help border-b border-dotted border-[#4A9FD8]"
                        title={trip.driverName}
                      >
                        {shortDriver}
                        {trip.driverName && trip.driverName !== shortDriver && (
                          <span className="pointer-events-none opacity-0 group-hover/drv:opacity-100 transition-opacity absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-[#483878] text-white text-xs font-bold whitespace-nowrap shadow-lg z-30">
                            {trip.driverName}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-2 text-[#444444] dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-[#483878] dark:text-[#A9DDF5] shrink-0" />
                      <span className="font-semibold">الوجهة:</span>
                      <span className="font-bold text-[#483878] dark:text-slate-100 truncate" title={trip.destination}>
                        {trip.destination}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <span className="text-xs font-mono text-[#444444] dark:text-slate-300 font-semibold">
                      المجدول: {trip.departureTime} ← {trip.arrivalTime}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTrip(trip);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8742A] hover:bg-[#d6661f] text-white text-xs sm:text-sm font-black shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                      <span>عرض التفاصيل</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
