import React, { useState, useMemo, useId } from 'react';
import {
  Bus,
  MapPin,
  Clock,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Trip } from '../types';
import { formatDuration, formatShortDriverName } from '../services/dateTimeUtils';
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

/**
 * Modern Aerodynamic VIP Coach Bus Component (Facing Left towards Destination in RTL)
 * Features DMTC official colors (Sky Blue & Orange), tinted glass, alloy rims, headlights, and crisp bus badge.
 */
const VIPCoachBus: React.FC<{
  busId: string;
  isPlaceholder?: boolean;
  statusColor?: string;
}> = ({
  busId,
  isPlaceholder = false,
  statusColor = '#22A06B',
}) => {
  const reactId = useId();
  const safeUid = reactId.replace(/[^a-zA-Z0-9_-]/g, '');

  return (
    <div className="relative flex flex-col items-center select-none group">
      {/* Compact Floating Bus ID Badge positioned cleanly above the bus */}
      <div
        className={`mb-0.5 px-1.5 py-[1px] rounded shadow-xs flex items-center gap-1 border transition-transform duration-200 ${
          isPlaceholder
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300'
            : 'bg-white dark:bg-slate-900 border-[#483878] dark:border-[#A9DDF5] text-[#483878] dark:text-[#A9DDF5]'
        }`}
      >
        {!isPlaceholder && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: statusColor }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: statusColor }}
            />
          </span>
        )}
        <span className="font-mono text-[10px] font-black tracking-tight leading-none whitespace-nowrap">
          {busId}
        </span>
      </div>

      {/* Compact Aerodynamic VIP Coach Bus SVG (Facing Left towards Destination in RTL) */}
      <div className="relative flex items-center justify-center">
        <svg
          width="66"
          height="26"
          viewBox="0 0 96 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_3px_rgba(72,56,120,0.24)]"
        >
          <defs>
            {/* Coach Body Gradient */}
            <linearGradient id={`busBodyGrad-${safeUid}`} x1="0" y1="3" x2="0" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="68%" stopColor="#F2F8FD" />
              <stop offset="100%" stopColor="#DCEBF7" />
            </linearGradient>

            {/* DMTC Signature Brand Ribbon (Navy -> Sky -> Gold -> Orange) */}
            <linearGradient id={`busRibbonGrad-${safeUid}`} x1="5" y1="0" x2="92" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#483878" />
              <stop offset="38%" stopColor="#4A9FD8" />
              <stop offset="72%" stopColor="#F5B13D" />
              <stop offset="100%" stopColor="#E8742A" />
            </linearGradient>

            {/* Front Headlight Beam Gradient (pointing forward/left) */}
            <linearGradient id={`headlightBeam-${safeUid}`} x1="6" y1="24" x2="-20" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#FEF08A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
            </linearGradient>

            {/* Tinted VIP Glass Gradient */}
            <linearGradient id={`windowGlass-${safeUid}`} x1="0" y1="6" x2="0" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#162033" />
              <stop offset="100%" stopColor="#2B3D5B" />
            </linearGradient>
          </defs>

          {/* Subtle Ground Shadow Under Bus */}
          <ellipse cx="48" cy="34.5" rx="40" ry="2.2" fill="#483878" opacity={isPlaceholder ? '0.1' : '0.2'} />

          {/* Forward Headlight Glow Beam */}
          {!isPlaceholder && (
            <polygon points="5,21 -18,15 -18,30 5,26" fill={`url(#headlightBeam-${safeUid})`} />
          )}

          {/* Main Coach Bus Body Silhouette with Crisp Navy Outline */}
          <path
            d="M 8 29
               L 5.5 26.5
               C 3.5 23, 3.5 19, 5 15.5
               L 10.5 5.5
               C 12 4.2, 14 4, 17 4
               L 87 4
               C 90 4, 91.5 5.5, 92 8.5
               L 92 29
               L 84 29
               A 6.2 6.2 0 0 0 71.6 29
               L 30.4 29
               A 6.2 6.2 0 0 0 18 29
               Z"
            fill={isPlaceholder ? '#F1F5F9' : `url(#busBodyGrad-${safeUid})`}
            stroke={isPlaceholder ? '#94A3B8' : '#483878'}
            strokeWidth="1.25"
          />

          {/* Lower Navy Chassis Skirt Trim for Clear Road Contrast */}
          {!isPlaceholder && (
            <path
              d="M 8 27.2 L 18 27.2 A 6.2 6.2 0 0 1 30.4 27.2 L 71.6 27.2 A 6.2 6.2 0 0 1 84 27.2 L 92 27.2 L 92 29 L 84 29 A 6.2 6.2 0 0 0 71.6 29 L 30.4 29 A 6.2 6.2 0 0 0 18 29 L 8 29 Z"
              fill="#483878"
              opacity="0.88"
            />
          )}

          {/* Roof HVAC / AC Unit */}
          <rect
            x="33"
            y="1.6"
            width="34"
            height="2.6"
            rx="1.1"
            fill={isPlaceholder ? '#E2E8F0' : '#DCEBF7'}
            stroke={isPlaceholder ? '#94A3B8' : '#483878'}
            strokeWidth="0.8"
          />
          <line x1="42" y1="2.9" x2="58" y2="2.9" stroke={isPlaceholder ? '#94A3B8' : '#4A9FD8'} strokeWidth="0.6" />

          {/* Aerodynamic Slanted Front Windshield */}
          <path
            d="M 6.2 15.5
               L 11.4 5.8
               C 12.2 5.4, 13.8 5.4, 16 5.4
               L 16 15.8
               Z"
            fill={isPlaceholder ? '#CBD5E1' : `url(#windowGlass-${safeUid})`}
            stroke={isPlaceholder ? '#94A3B8' : '#483878'}
            strokeWidth="0.6"
          />
          {/* Windshield Reflection Glare */}
          <path d="M 8 13.5 L 12.6 6.2 L 13.8 6.2 L 9.2 13.5 Z" fill="#A9DDF5" opacity="0.75" />

          {/* Driver Side Window */}
          <rect
            x="17.8"
            y="5.8"
            width="9"
            height="9.6"
            rx="1"
            fill={isPlaceholder ? '#CBD5E1' : `url(#windowGlass-${safeUid})`}
            stroke={isPlaceholder ? '#94A3B8' : '#483878'}
            strokeWidth="0.5"
          />

          {/* VIP Panoramic Tinted Passenger Windows */}
          <rect x="28.5" y="5.8" width="13" height="9.6" rx="1" fill={isPlaceholder ? '#CBD5E1' : `url(#windowGlass-${safeUid})`} stroke={isPlaceholder ? '#94A3B8' : '#483878'} strokeWidth="0.5" />
          <rect x="43.2" y="5.8" width="13" height="9.6" rx="1" fill={isPlaceholder ? '#CBD5E1' : `url(#windowGlass-${safeUid})`} stroke={isPlaceholder ? '#94A3B8' : '#483878'} strokeWidth="0.5" />
          <rect x="57.9" y="5.8" width="13" height="9.6" rx="1" fill={isPlaceholder ? '#CBD5E1' : `url(#windowGlass-${safeUid})`} stroke={isPlaceholder ? '#94A3B8' : '#483878'} strokeWidth="0.5" />
          <rect x="72.6" y="5.8" width="13.5" height="9.6" rx="1" fill={isPlaceholder ? '#CBD5E1' : `url(#windowGlass-${safeUid})`} stroke={isPlaceholder ? '#94A3B8' : '#483878'} strokeWidth="0.5" />

          {/* Panoramic Window Glass Reflection Line */}
          <line x1="19" y1="7.4" x2="85" y2="7.4" stroke="#A9DDF5" strokeWidth="0.7" opacity="0.55" />

          {/* DMTC Brand Livery Text Centered on Side Panel Above Stripe */}
          <text
            x="55"
            y="20"
            fill={isPlaceholder ? '#64748B' : '#483878'}
            fontSize="4.2"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            DMTC درة المنورة
          </text>

          {/* DMTC Signature Brand Curved Livery Stripe */}
          <path
            d="M 5 21.6
               C 18 21.6, 30 23.2, 48 23.2
               C 66 23.2, 79 20.8, 92 20.8
               L 92 24.4
               C 79 24.4, 66 26, 48 26
               C 30 26, 18 24.4, 5 24.4
               Z"
            fill={isPlaceholder ? '#94A3B8' : `url(#busRibbonGrad-${safeUid})`}
          />

          {/* Front Xenon Headlight (Left) */}
          <circle cx="4.8" cy="24" r="1.9" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />

          {/* Rear LED Taillight (Right) */}
          <rect x="90" y="17.5" width="1.8" height="6" rx="0.6" fill="#D92D20" />

          {/* Front Driver Side Mirror */}
          <path d="M 6.8 11.8 L 3.4 13 L 3.4 15.6 L 6.3 14.3 Z" fill="#483878" />

          {/* Front Wheel at x=24.2 */}
          <circle cx="24.2" cy="29.5" r="5.5" fill="#1E293B" stroke="#0F172A" strokeWidth="0.9" />
          <circle cx="24.2" cy="29.5" r="3.4" fill="#CBD5E1" />
          <circle cx="24.2" cy="29.5" r="1.4" fill="#483878" />
          <line x1="24.2" y1="26.4" x2="24.2" y2="32.6" stroke="#475569" strokeWidth="0.6" />
          <line x1="21.1" y1="29.5" x2="27.3" y2="29.5" stroke="#475569" strokeWidth="0.6" />

          {/* Rear Wheel at x=77.8 */}
          <circle cx="77.8" cy="29.5" r="5.5" fill="#1E293B" stroke="#0F172A" strokeWidth="0.9" />
          <circle cx="77.8" cy="29.5" r="3.4" fill="#CBD5E1" />
          <circle cx="77.8" cy="29.5" r="1.4" fill="#483878" />
          <line x1="77.8" y1="26.4" x2="77.8" y2="32.6" stroke="#475569" strokeWidth="0.6" />
          <line x1="74.7" y1="29.5" x2="80.9" y2="29.5" stroke="#475569" strokeWidth="0.6" />
        </svg>
      </div>
    </div>
  );
};

export const AnimatedBusMovementCenter: React.FC<AnimatedBusMovementCenterProps> = ({
  trips,
  currentTime,
  onSelectTrip,
  onOpenImport,
  enableDashboardFeatures = false,
}) => {
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Distinct operation types for filter dropdown
  const operationTypes = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => set.add(getOperationTypeLabel(t)));
    return Array.from(set);
  }, [trips]);

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

  return (
    <div className="w-full bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm relative select-none flex flex-col justify-between">
      {/* Box Header with Total Active Buses Count & Optional Dashboard Filters */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/20 dark:border-[#A9DDF5]/25 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
              <Bus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#483878] dark:text-slate-100 tracking-tight">
                حركة الحافلات على الطريق
              </h2>
              <p className="text-xs text-[#444444] dark:text-slate-300 font-semibold">
                حركة تقديرية ولحظية مباشرة حسب مسارات الرحلات
              </p>
            </div>
          </div>

          {/* Live Active Buses Counter Badge */}
          <div className="flex items-center gap-2">
            {activeTrips.length > 0 ? (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#A9DDF5]/35 dark:bg-[#4A9FD8]/20 text-[#483878] dark:text-[#A9DDF5] border border-[#4A9FD8]/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4A9FD8] dot-pulse-live" />
                <span>جميع الحافلات على الطريق ({activeTrips.length} حافلة)</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F7FBFE] dark:bg-slate-800 text-[#444444] dark:text-slate-300 border border-[#A9DDF5] dark:border-slate-700">
                لا توجد حافلات جارية حالياً
              </span>
            )}
          </div>
        </div>

        {/* Dashboard Filters: نوع العملية & الحالة */}
        {enableDashboardFeatures && trips.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#444444] dark:text-slate-300">
                <Filter className="w-3.5 h-3.5 text-[#4A9FD8]" />
                <span>تصفية المسار:</span>
              </div>

              <select
                value={operationTypeFilter}
                onChange={(e) => setOperationTypeFilter(e.target.value)}
                aria-label="نوع العملية"
                className="bg-[#F7FBFE] dark:bg-slate-800 text-xs sm:text-sm font-bold text-[#444444] dark:text-slate-200 px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none cursor-pointer max-w-[220px]"
              >
                <option value="all">نوع العملية: الكل</option>
                {operationTypes.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="الحالة"
                className="bg-[#F7FBFE] dark:bg-slate-800 text-xs sm:text-sm font-bold text-[#444444] dark:text-slate-200 px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none cursor-pointer"
              >
                <option value="all">الحالة: الكل</option>
                <option value="on_time">في الموعد (أخضر)</option>
                <option value="minor_delay">تأخر أقل من 15 دقيقة (أصفر)</option>
                <option value="major_delay">تأخر 15 دقيقة فأكثر (أحمر)</option>
                <option value="upcoming">مجدولة قادمة</option>
                <option value="completed">مكتملة</option>
              </select>

              {(operationTypeFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setOperationTypeFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs font-bold text-[#E8742A] hover:underline px-2 py-1 cursor-pointer"
                >
                  إعادة ضبط
                </button>
              )}
            </div>

            {/* Color Legend (Strictly Status Colors) */}
            <div className="flex items-center gap-3 text-xs font-bold text-[#444444] dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B]" />
                <span>في الموعد</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5A100]" />
                <span>تأخر &lt; 15 د</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D92D20]" />
                <span>تأخر ≥ 15 د</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lanes Content: 2 columns on wide screens (>1600px), compact rows */}
      <div className="flex-1 flex flex-col justify-start max-h-[580px] overflow-y-auto pr-1">
        {trips.length === 0 ? (
          /* Single Clean Top Empty State Card */
          <div className="p-8 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/60 border border-dashed border-[#A9DDF5] dark:border-slate-700 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
              <Bus className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-[#483878] dark:text-slate-100">
                لا توجد رحلات بعد
              </p>
              <p className="text-xs sm:text-[13px] text-[#444444] dark:text-slate-300 font-medium">
                قم باستيراد ملف جدول الرحلات لعرض حركة الحافلات والمؤشرات التشغيلية مباشرة
              </p>
            </div>
            {onOpenImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] text-white font-black text-xs sm:text-sm shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>استيراد جدول الرحلات</span>
              </button>
            )}
          </div>
        ) : displayTrips.length === 0 ? (
          <div className="py-12 text-center bg-[#F7FBFE] dark:bg-slate-800/60 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
            <Bus className="w-8 h-8 text-[#4A9FD8] mx-auto mb-2" />
            <p className="text-sm font-bold text-[#483878] dark:text-slate-100">
              لا توجد حافلات مطابقة لخيارات التصفية
            </p>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-1">
              جرّب تغيير نوع العملية أو الحالة لعرض باقي الرحلات
            </p>
          </div>
        ) : (
          /* Compact Populated Lanes (2 columns on screens > 1600px) */
          <div className="grid grid-cols-1 min-[1601px]:grid-cols-2 gap-2.5">
            {displayTrips.map((trip) => {
              // Single unified progress percentage driving circle, fill width, and bus icon position
              const progressPercent = Math.max(0, Math.min(100, Math.round(trip.progress * 100)));
              const shortDriver = formatShortDriverName(trip.driverName);

              // Compute ETA & delay status
              const delayMinutes = computeTripDelayMinutes(trip, currentTime);
              const isConflict = trip.status === 'conflict' || (trip.conflicts && trip.conflicts.length > 0);
              const isCompleted = trip.status === 'completed_actual' || trip.status === 'completed_scheduled';
              const isUpcoming = trip.status === 'scheduled_upcoming';
              const isActiveTrip =
                trip.status === 'in_progress_scheduled' || trip.status === 'started_actual';
              const elapsedSinceDepMs =
                currentTime.getTime() - new Date(trip.departureDateTime).getTime();
              const isJustStarted =
                isActiveTrip && elapsedSinceDepMs >= 0 && elapsedSinceDepMs <= 5 * 60 * 1000;

              const scheduledArrMs = new Date(trip.arrivalDateTime).getTime();
              const expectedArrMs =
                delayMinutes > 0 && !isCompleted
                  ? scheduledArrMs + delayMinutes * 60000
                  : scheduledArrMs;
              const etaMinutes = Math.max(
                0,
                Math.round((expectedArrMs - currentTime.getTime()) / 60000)
              );

              // Strict Status Colors (Green #22A06B, Yellow #E5A100, Red #D92D20)
              let trackColorStyle = 'linear-gradient(to left, rgba(74,159,216,0.32), rgba(169,221,245,0.22))';
              let ringClasses = 'bg-[#F7FBFE] dark:bg-slate-800 border-[#4A9FD8] text-[#483878] dark:text-slate-100';
              let statusPillClasses = 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/30';
              let varianceText = isJustStarted ? 'بدأت الرحلة الآن' : 'في الموعد';
              let cardBorderClasses = isJustStarted
                ? 'border-[#22A06B] ring-2 ring-[#22A06B]/20 hover:border-[#22A06B]'
                : 'border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]';
              let busStatusDotColor = '#22A06B';

              if (enableDashboardFeatures) {
                if (delayMinutes >= 15 || isConflict) {
                  trackColorStyle = 'linear-gradient(to left, rgba(217,45,32,0.38), rgba(217,45,32,0.16))';
                  ringClasses = 'bg-[#D92D20]/10 border-[#D92D20] text-[#D92D20]';
                  statusPillClasses = 'bg-[#D92D20]/10 text-[#D92D20] border-[#D92D20]/40';
                  cardBorderClasses = 'border-[#D92D20]/40 hover:border-[#D92D20]';
                  busStatusDotColor = '#D92D20';
                  varianceText =
                    delayMinutes > 0
                      ? `متأخر ${delayMinutes} دقيقة`
                      : 'تعارض بالجدول';
                } else if (delayMinutes > 0 && delayMinutes < 15) {
                  trackColorStyle = 'linear-gradient(to left, rgba(229,161,0,0.40), rgba(229,161,0,0.16))';
                  ringClasses = 'bg-[#E5A100]/10 border-[#E5A100] text-[#9A6B00] dark:text-[#F5B13D]';
                  statusPillClasses = 'bg-[#E5A100]/12 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/45';
                  cardBorderClasses = 'border-[#E5A100]/45 hover:border-[#E5A100]';
                  busStatusDotColor = '#E5A100';
                  varianceText = `متأخر ${delayMinutes} دقيقة`;
                } else {
                  trackColorStyle = 'linear-gradient(to left, rgba(34,160,107,0.35), rgba(34,160,107,0.14))';
                  ringClasses = 'bg-[#22A06B]/10 border-[#22A06B] text-[#22A06B]';
                  statusPillClasses = 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/35';
                  cardBorderClasses = isJustStarted
                    ? 'border-[#22A06B] ring-2 ring-[#22A06B]/20 hover:border-[#22A06B]'
                    : 'border-[#A9DDF5] dark:border-slate-700 hover:border-[#22A06B]';
                  busStatusDotColor = '#22A06B';
                  varianceText = isCompleted
                    ? 'وصلت في الموعد'
                    : isUpcoming
                    ? 'مجدولة في الموعد'
                    : isJustStarted
                    ? 'بدأت الرحلة الآن'
                    : 'في الموعد';
                }
              }

              return (
                <motion.div
                  key={trip.id}
                  layout
                  initial={isJustStarted ? { opacity: 0, y: -8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => onSelectTrip && onSelectTrip(trip)}
                  className={`px-3 py-2 rounded-xl bg-[#F7FBFE]/85 dark:bg-slate-800/70 border ${cardBorderClasses} hover:bg-white dark:hover:bg-slate-800 transition-colors flex flex-col lg:flex-row items-center justify-between gap-2.5 shadow-xs cursor-pointer`}
                >
                  {/* Right Cluster (in RTL): Bus ID + Short Driver + Circular Progress Ring */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-xs font-black text-[#483878] dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-[#A9DDF5] dark:border-slate-700 shadow-2xs">
                        {trip.busId}
                      </span>

                      <div
                        className="relative group/driver mt-0.5 text-center"
                        title={trip.driverName}
                      >
                        <span className="text-[11px] text-[#444444] dark:text-slate-200 font-bold whitespace-nowrap px-0.5 cursor-help border-b border-dotted border-[#4A9FD8]/60">
                          {shortDriver}
                        </span>
                        {trip.driverName && trip.driverName !== shortDriver && (
                          <div className="pointer-events-none opacity-0 group-hover/driver:opacity-100 transition-opacity absolute bottom-full right-1/2 translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-[#483878] text-white text-xs font-bold whitespace-nowrap shadow-lg z-30">
                            {trip.driverName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Circular Progress Indicator driven by unified progressPercent */}
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono tabular-nums text-[11px] font-black shadow-2xs shrink-0 ${ringClasses}`}
                    >
                      {progressPercent}%
                    </div>
                  </div>

                  {/* Middle: Stations cleanly separated at ends + Road Track below */}
                  <div className="flex-1 w-full min-w-0 px-1">
                    {/* Origin (Right) & Destination (Left) cleanly above track with enough clearance for the bus badge */}
                    <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs font-bold text-[#444444] dark:text-slate-300 mb-3">
                      <span className="flex items-center gap-1 text-[#483878] dark:text-slate-100 min-w-0 max-w-[46%]">
                        <MapPin className="w-3 h-3 text-[#483878] dark:text-[#A9DDF5] shrink-0" />
                        <span className="truncate" title={trip.origin}>{trip.origin}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[#483878] dark:text-slate-100 min-w-0 max-w-[46%]">
                        <span className="truncate" title={trip.destination}>{trip.destination}</span>
                        <MapPin className="w-3 h-3 text-[#4A9FD8] shrink-0" />
                      </span>
                    </div>

                    {/* Compact Highway Road Lane */}
                    <div className="h-9 bg-gradient-to-b from-[#E5EFF7] via-[#DCE9F4] to-[#D2E2F0] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-lg relative flex items-center px-8 border border-[#A9DDF5] dark:border-slate-700 shadow-inner">
                      {/* Inner Track (0% right edge -> 100% left edge): Shared by fill width AND bus icon */}
                      <div className="relative w-full h-full flex items-center">
                        {/* Start/End Terminal Markers */}
                        <span className="w-1.5 h-1.5 rounded-full bg-[#483878]/50 dark:bg-[#A9DDF5]/60 absolute right-0 top-1/2 -translate-y-1/2 z-10" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A9FD8]/70 absolute left-0 top-1/2 -translate-y-1/2 z-10" />

                        {/* Dashed center markings */}
                        <div className="w-full h-0.5 border-b border-dashed border-slate-500/45 dark:border-slate-500/60 translate-y-1.5" />

                        {/* Progress track fill driven by progressPercent */}
                        <motion.div
                          style={{ background: trackColorStyle }}
                          className="absolute inset-y-0 right-0 rounded-r-md"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                        />

                        {/* Animated VIP Coach Bus anchored at exact progressPercent */}
                        <motion.div
                          className="absolute -top-3.5 z-20 pointer-events-none"
                          initial={{ right: '0%' }}
                          animate={{ right: `${progressPercent}%` }}
                          transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                        >
                          <div className="translate-x-1/2">
                            <VIPCoachBus busId={trip.busId || 'DMTC'} statusColor={busStatusDotColor} />
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Left Cluster (in RTL): Status Variance Pill, Timings & ETA */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto text-left font-mono text-xs shrink-0 lg:min-w-[140px] gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${statusPillClasses}`}
                    >
                      {enableDashboardFeatures ? varianceText : 'جارية الآن'}
                    </span>
                    <div className="flex items-center gap-1 text-[#483878] dark:text-slate-100 font-bold text-[11px]">
                      <Clock className="w-3 h-3 text-[#4A9FD8]" />
                      <span>
                        {trip.departureTime} ← {trip.arrivalTime}
                      </span>
                    </div>
                    {enableDashboardFeatures ? (
                      <span className="text-[11px] text-[#444444] dark:text-slate-300 font-sans font-bold">
                        {isCompleted
                          ? 'مكتملة'
                          : etaMinutes > 0
                          ? `المتبقي (ETA): ${formatDuration(etaMinutes, 'ar')}`
                          : `الوصول المتوقع ${trip.arrivalTime}`}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#444444] dark:text-slate-300 font-sans">
                        الوصول المتوقع {trip.arrivalTime}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
