import React from 'react';
import { Bus, User, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { Trip } from '../types';
import { getStatusMeta, isAwaitingArrivalConfirmation } from '../services/scheduleEngine';

export interface HoveredTripState {
  trip: Trip;
  x: number;
  y: number;
  placeBelow: boolean;
  isOverlappingOnRoute?: boolean;
}

export function buildHoveredTripState(
  target: HTMLElement,
  trip: Trip,
  isOverlappingOnRoute?: boolean
): HoveredTripState {
  const rect = target.getBoundingClientRect();
  const halfTooltipWidth = 148;
  const x = Math.min(
    window.innerWidth - halfTooltipWidth - 12,
    Math.max(halfTooltipWidth + 12, rect.left + rect.width / 2)
  );
  const placeBelow = rect.top < 190;
  const y = placeBelow ? rect.bottom + 10 : rect.top - 10;

  return {
    trip,
    x,
    y,
    placeBelow,
    isOverlappingOnRoute,
  };
}

interface TripHoverTooltipProps {
  hovered: HoveredTripState | null;
}

export const TripHoverTooltip: React.FC<TripHoverTooltipProps> = ({ hovered }) => {
  if (!hovered) return null;

  const { trip, x, y, placeBelow, isOverlappingOnRoute } = hovered;
  const statusMeta = getStatusMeta(trip.status, 'ar');
  const hasConflict = Boolean(trip.conflicts && trip.conflicts.length > 0);
  const routeLabel =
    (trip.route || '').trim() ||
    `${(trip.origin || '').trim() || 'نقطة الانطلاق'} ← ${(trip.destination || '').trim() || 'الوجهة'}`;

  return (
    <div
      role="tooltip"
      dir="rtl"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
      className="fixed z-50 w-72 pointer-events-none rounded-2xl bg-white/98 dark:bg-[#0F172A]/98 backdrop-blur-md border border-[#A9DDF5] dark:border-slate-600 shadow-xl p-3 text-right transition-opacity duration-150"
    >
      {/* Header: Trip Number + Status Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#A9DDF5]/60 dark:border-slate-700">
        <span className="font-mono text-xs font-black text-[#483878] dark:text-slate-100 truncate">
          {trip.tripNumber}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold whitespace-nowrap shrink-0 ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: statusMeta.colorHex }}
            />
            <span>{statusMeta.label}</span>
          </span>
          {isAwaitingArrivalConfirmation(trip) && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#E5A100]/12 text-[#92400E] dark:text-amber-300 border border-[#E5A100]/35 whitespace-nowrap">
              بانتظار تأكيد الوصول
            </span>
          )}
          {trip.isElapsedAtImport &&
            (trip.status === 'completed_scheduled' || trip.status === 'completed_actual') && (
              <span
                title="حُسبت من الجدول المستورد"
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] dark:text-emerald-300 border border-[#22A06B]/30 whitespace-nowrap"
              >
                منجزة تلقائياً
              </span>
            )}
        </div>
      </div>

      {/* Body: Bus ID, Driver Name, Time & Route */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#444444] dark:text-slate-300 font-semibold">
            <Bus className="w-3.5 h-3.5 text-[#4A9FD8] shrink-0" />
            <span>رقم الحافلة:</span>
          </div>
          <span className="font-mono font-black text-[#483878] dark:text-slate-100">
            {trip.busId || 'غير محدد'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#444444] dark:text-slate-300 font-semibold shrink-0">
            <User className="w-3.5 h-3.5 text-[#E8742A] shrink-0" />
            <span>اسم السائق:</span>
          </div>
          <span className="font-bold text-[#483878] dark:text-slate-100 truncate">
            {trip.driverName || 'غير محدد'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#444444] dark:text-slate-300 font-semibold shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#4A9FD8] shrink-0" />
            <span>الوقت:</span>
          </div>
          <span className="font-mono font-bold text-[#483878] dark:text-slate-200 tabular-nums" dir="ltr">
            {trip.departureTime} - {trip.arrivalTime}
          </span>
        </div>

        <div className="flex items-start gap-1.5 pt-0.5 text-[#444444] dark:text-slate-300">
          <Navigation className="w-3.5 h-3.5 text-[#4A9FD8] shrink-0 mt-0.5" />
          <span className="font-semibold text-[#483878] dark:text-slate-200 line-clamp-1">
            {routeLabel}
          </span>
        </div>

        {(hasConflict || isOverlappingOnRoute) && (
          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg bg-[#D92D20]/10 dark:bg-red-950/50 border border-[#D92D20]/30 text-[#D92D20] dark:text-red-300 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {hasConflict ? 'يوجد تعارض مجدول في هذه الرحلة' : 'رحلة متداخلة زمنياً على نفس المسار'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
