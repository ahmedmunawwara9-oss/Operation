import React, { useMemo, useState } from 'react';
import { Bus, MapPin, Navigation, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Trip } from '../types';
import { computeTripDelayMinutes } from './DelayedTripsDrawer';
import { formatShortDriverName } from '../services/dateTimeUtils';

export type CityId = 'jeddah' | 'makkah' | 'madinah';

interface CityNode {
  id: CityId;
  name: string;
  x: number;
  y: number;
  mockCoords: string;
}

interface CorridorDef {
  id: string;
  from: CityId;
  to: CityId;
  controlX: number;
  controlY: number;
  label: string;
}

interface CityRouteMapProps {
  trips: Trip[];
  currentTime: Date;
  onSelectTrip?: (trip: Trip) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const CITIES: Record<CityId, CityNode> = {
  madinah: {
    id: 'madinah',
    name: 'المدينة المنورة',
    x: 450,
    y: 86,
    mockCoords: '24.47° N, 39.61° E',
  },
  jeddah: {
    id: 'jeddah',
    name: 'جدة',
    x: 185,
    y: 266,
    mockCoords: '21.49° N, 39.19° E',
  },
  makkah: {
    id: 'makkah',
    name: 'مكة المكرمة',
    x: 525,
    y: 304,
    mockCoords: '21.39° N, 39.86° E',
  },
};

const CORRIDORS: CorridorDef[] = [
  {
    id: 'jeddah-makkah',
    from: 'jeddah',
    to: 'makkah',
    controlX: 355,
    controlY: 332,
    label: 'طريق الحرمين (جدة ⇄ مكة)',
  },
  {
    id: 'jeddah-madinah',
    from: 'jeddah',
    to: 'madinah',
    controlX: 248,
    controlY: 132,
    label: 'طريق الهجرة الساحلي (جدة ⇄ المدينة)',
  },
  {
    id: 'makkah-madinah',
    from: 'makkah',
    to: 'madinah',
    controlX: 546,
    controlY: 184,
    label: 'طريق الهجرة السريع (مكة ⇄ المدينة)',
  },
];

function resolveCityId(text?: string): CityId | null {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  if (
    normalized.includes('جدة') ||
    normalized.includes('مطار الملك') ||
    normalized.includes('jeddah')
  ) {
    return 'jeddah';
  }
  if (
    normalized.includes('مكة') ||
    normalized.includes('الحرم') ||
    normalized.includes('العزيزية') ||
    normalized.includes('makkah') ||
    normalized.includes('mecca')
  ) {
    return 'makkah';
  }
  if (
    normalized.includes('المدينة') ||
    normalized.includes('المدينه') ||
    normalized.includes('النبوي') ||
    normalized.includes('السلام') ||
    normalized.includes('madinah') ||
    normalized.includes('medina')
  ) {
    return 'madinah';
  }
  return null;
}

function getCorridorBetween(a: CityId, b: CityId): CorridorDef | null {
  return (
    CORRIDORS.find(
      (c) => (c.from === a && c.to === b) || (c.from === b && c.to === a)
    ) ?? null
  );
}

function evalQuadraticBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
): { x: number; y: number; nx: number; ny: number } {
  const mt = 1 - t;
  const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
  const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;

  // Tangent derivative for perpendicular offset so adjacent buses don't overlap
  const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / len, ny: dx / len };
}

type MapStatusCategory = 'on_road' | 'upcoming' | 'delayed' | 'completed';

interface PlottedBus {
  trip: Trip;
  originCity: CityId;
  destCity: CityId;
  category: MapStatusCategory;
  statusLabel: string;
  color: string;
  x: number;
  y: number;
  progressPct: number;
  corridorId: string;
}

export const CityRouteMap: React.FC<CityRouteMapProps> = ({
  trips,
  currentTime,
  onSelectTrip,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | MapStatusCategory>('all');
  const [selectedCity, setSelectedCity] = useState<CityId | null>(null);
  const [hoveredBus, setHoveredBus] = useState<PlottedBus | null>(null);

  const plottedBuses = useMemo(() => {
    const rawItems: Array<{
      trip: Trip;
      originCity: CityId;
      destCity: CityId;
      category: MapStatusCategory;
      statusLabel: string;
      color: string;
      t: number;
      progressPct: number;
      corridor: CorridorDef;
    }> = [];

    trips.forEach((trip) => {
      if (trip.status === 'cancelled' || trip.actualStatus === 'cancelled') return;

      const originCity = resolveCityId(trip.origin);
      const destCity = resolveCityId(trip.destination);
      if (!originCity || !destCity || originCity === destCity) return;

      const corridor = getCorridorBetween(originCity, destCity);
      if (!corridor) return;

      const delayMinutes = computeTripDelayMinutes(trip, currentTime);
      const isConflict =
        trip.status === 'conflict' || (trip.conflicts && trip.conflicts.length > 0);
      const isCompleted =
        trip.status === 'completed_actual' || trip.status === 'completed_scheduled';
      const isUpcoming = trip.status === 'scheduled_upcoming';

      let category: MapStatusCategory = 'on_road';
      let statusLabel = 'على الطريق';
      let color = '#2E7CF6';
      let t = Math.max(0.08, Math.min(0.92, trip.progress || 0.1));

      if (isCompleted) {
        category = 'completed';
        statusLabel = 'منجزة';
        color = '#22A06B';
        t = 0.96;
      } else if (delayMinutes >= 15 || isConflict) {
        category = 'delayed';
        statusLabel = delayMinutes > 0 ? `متأخرة (${delayMinutes} د)` : 'تعارض';
        color = '#D92D20';
        t = trip.actualDepartureTime || trip.status === 'in_progress_scheduled' || trip.status === 'started_actual'
          ? Math.max(0.12, Math.min(0.88, trip.progress))
          : 0.07;
      } else if (delayMinutes > 0) {
        category = 'delayed';
        statusLabel = `متأخرة (${delayMinutes} د)`;
        color = '#E5A100';
        t = Math.max(0.1, Math.min(0.9, trip.progress || 0.1));
      } else if (isUpcoming) {
        category = 'upcoming';
        statusLabel = 'قادمة';
        color = '#4A9FD8';
        t = 0.05;
      }

      rawItems.push({
        trip,
        originCity,
        destCity,
        category,
        statusLabel,
        color,
        t,
        progressPct: Math.max(0, Math.min(100, Math.round(trip.progress * 100))),
        corridor,
      });
    });

    // Spread nearby markers on the same corridor & t bucket so buses remain individually clickable
    const bucketCounter = new Map<string, number>();

    return rawItems.map((item): PlottedBus => {
      const p0 = CITIES[item.originCity];
      const p2 = CITIES[item.destCity];
      const p1 = { x: item.corridor.controlX, y: item.corridor.controlY };

      const bucketKey = `${item.corridor.id}:${item.originCity}:${Math.round(item.t * 10)}`;
      const idxInBucket = bucketCounter.get(bucketKey) ?? 0;
      bucketCounter.set(bucketKey, idxInBucket + 1);

      const pos = evalQuadraticBezier(p0, p1, p2, item.t);
      const laneStep = idxInBucket === 0 ? 0 : (idxInBucket % 2 === 1 ? 1 : -1) * Math.ceil(idxInBucket / 2) * 14;

      return {
        trip: item.trip,
        originCity: item.originCity,
        destCity: item.destCity,
        category: item.category,
        statusLabel: item.statusLabel,
        color: item.color,
        x: pos.x + pos.nx * laneStep,
        y: pos.y + pos.ny * laneStep,
        progressPct: item.progressPct,
        corridorId: item.corridor.id,
      };
    });
  }, [trips, currentTime]);

  const counts = useMemo(() => {
    const map: Record<MapStatusCategory, number> = {
      on_road: 0,
      upcoming: 0,
      delayed: 0,
      completed: 0,
    };
    plottedBuses.forEach((b) => {
      map[b.category] += 1;
    });
    return map;
  }, [plottedBuses]);

  const visibleBuses = useMemo(() => {
    return plottedBuses.filter((b) => {
      if (statusFilter !== 'all' && b.category !== statusFilter) return false;
      if (selectedCity && b.originCity !== selectedCity && b.destCity !== selectedCity) {
        return false;
      }
      return true;
    });
  }, [plottedBuses, statusFilter, selectedCity]);

  const filterButtons: Array<{ id: 'all' | MapStatusCategory; label: string; count: number; dot?: string }> = [
    { id: 'all', label: 'الكل', count: plottedBuses.length },
    { id: 'on_road', label: 'على الطريق', count: counts.on_road, dot: '#2E7CF6' },
    { id: 'upcoming', label: 'قادمة', count: counts.upcoming, dot: '#4A9FD8' },
    { id: 'delayed', label: 'متأخرة', count: counts.delayed, dot: '#D92D20' },
    { id: 'completed', label: 'منجزة', count: counts.completed, dot: '#22A06B' },
  ];

  const cityList = Object.values(CITIES);

  return (
    <section
      className={`w-full card-white rounded-2xl p-4 sm:p-6 select-none flex flex-col gap-4 ${
        isExpanded ? 'flex-1' : ''
      }`}
    >
      {/* Header & Interactive Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[16px] sm:text-[18px] font-bold text-[#483878] dark:text-slate-100">
              خريطة مسارات الحافلات بين المدن
            </h2>
            <p className="text-[13px] text-[#444444] dark:text-slate-300">
              موقع تقديري تفاعلي بين جدة ومكة المكرمة والمدينة المنورة حسب حالة كل رحلة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterButtons.map((btn) => {
            const isActive = statusFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#483878] text-white shadow-2xs'
                    : 'bg-[#F7FBFE] dark:bg-slate-800 text-[#444444] dark:text-slate-200 border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]'
                }`}
              >
                {btn.dot && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: btn.dot }}
                    aria-hidden="true"
                  />
                )}
                <span>{btn.label}</span>
                <span className="font-mono tabular-nums text-[12px] opacity-85">
                  ({btn.count})
                </span>
              </button>
            );
          })}

          {(selectedCity || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCity(null);
                setStatusFilter('all');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[13px] font-bold text-[#E8742A] hover:bg-[#E8742A]/10 transition-colors cursor-pointer"
              title="عرض جميع المدن والحالات"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-pressed={isExpanded}
              title={
                isExpanded
                  ? 'تقليص الخريطة وإظهار الأعمدة الجانبية'
                  : 'توسيع الخريطة لتشغل كامل المساحة الرئيسية'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                isExpanded
                  ? 'bg-[#483878] text-white hover:bg-[#3a2d63] shadow-2xs'
                  : 'bg-[#EEF7FC] dark:bg-slate-800 text-[#483878] dark:text-[#A9DDF5] border border-[#4A9FD8]/60 dark:border-slate-600 hover:bg-[#E1F1FA] dark:hover:bg-slate-700'
              }`}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                  <span>تقليص الخريطة</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                  <span>توسيع الخريطة</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Interactive SVG Schematic Map */}
      <div className="relative w-full rounded-2xl bg-[#F2F8FD] dark:bg-[#0D1526] border border-[#A9DDF5] dark:border-slate-700 overflow-hidden">
        <svg
          viewBox="0 0 700 370"
          className={
            isExpanded
              ? 'w-full h-[460px] sm:h-[560px] lg:h-[620px] block'
              : 'w-full h-[300px] sm:h-[360px] block'
          }
          role="img"
          aria-label="خريطة مسارات الحافلات بين جدة ومكة المكرمة والمدينة المنورة"
        >
          <defs>
            <pattern
              id="routeMapGrid"
              width="35"
              height="35"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 35 0 L 0 0 0 35"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4A9FD8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#4A9FD8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle Coordinate Grid */}
          <rect
            width="700"
            height="370"
            fill="url(#routeMapGrid)"
            className="text-[#483878] dark:text-[#A9DDF5]"
          />

          {/* Red Sea Coastline Schematic Accent (West of Jeddah-Madinah) */}
          <path
            d="M 0 0 L 125 0 C 138 75, 118 145, 134 215 C 148 275, 135 330, 152 370 L 0 370 Z"
            fill="#4A9FD8"
            fillOpacity="0.1"
          />
          <text
            x="64"
            y="215"
            textAnchor="middle"
            className="fill-[#4A9FD8] dark:fill-[#A9DDF5]/70 text-[13px] font-bold"
            opacity="0.7"
          >
            البحر الأحمر
          </text>

          {/* Curved Route Corridors */}
          {CORRIDORS.map((corridor) => {
            const p0 = CITIES[corridor.from];
            const p2 = CITIES[corridor.to];
            const pathD = `M ${p0.x} ${p0.y} Q ${corridor.controlX} ${corridor.controlY} ${p2.x} ${p2.y}`;
            const isHighlighted =
              (hoveredBus && hoveredBus.corridorId === corridor.id) ||
              (selectedCity &&
                (corridor.from === selectedCity || corridor.to === selectedCity));

            return (
              <g key={corridor.id}>
                {/* Road Outer Casing */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isHighlighted ? '#4A9FD8' : '#94A3B8'}
                  strokeOpacity={isHighlighted ? 0.45 : 0.25}
                  strokeWidth={isHighlighted ? 12 : 9}
                  strokeLinecap="round"
                />
                {/* Road Dashed Centerline */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isHighlighted ? '#2E7CF6' : '#64748B'}
                  strokeOpacity={isHighlighted ? 0.9 : 0.55}
                  strokeWidth={2.5}
                  strokeDasharray="7 7"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Three City Nodes (جدة، مكة المكرمة، المدينة المنورة) */}
          {cityList.map((city) => {
            const isCitySelected = selectedCity === city.id;
            const cityTripsCount = plottedBuses.filter(
              (b) => b.originCity === city.id || b.destCity === city.id
            ).length;

            return (
              <g
                key={city.id}
                transform={`translate(${city.x}, ${city.y})`}
                onClick={() =>
                  setSelectedCity((prev) => (prev === city.id ? null : city.id))
                }
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`تصفية رحلات ${city.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCity((prev) => (prev === city.id ? null : city.id));
                  }
                }}
              >
                <circle r={isCitySelected ? 34 : 26} fill="url(#cityGlow)" />
                <circle
                  r={11}
                  className={
                    isCitySelected
                      ? 'fill-[#E8742A] stroke-white'
                      : 'fill-[#483878] dark:fill-[#4A9FD8] stroke-white dark:stroke-slate-900'
                  }
                  strokeWidth={3}
                />
                <circle r={3.5} fill="#FFFFFF" />

                {/* City Name Pill + Mock Coordinates */}
                <g
                  transform={
                    city.id === 'madinah'
                      ? 'translate(0, -34)'
                      : city.id === 'jeddah'
                      ? 'translate(0, 32)'
                      : 'translate(0, 32)'
                  }
                >
                  <rect
                    x={-68}
                    y={-15}
                    width={136}
                    height={30}
                    rx={10}
                    className={
                      isCitySelected
                        ? 'fill-[#483878] stroke-[#E8742A]'
                        : 'fill-white/95 dark:fill-slate-900/95 stroke-[#A9DDF5] dark:stroke-slate-600'
                    }
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    className={`text-[13px] font-bold ${
                      isCitySelected
                        ? 'fill-white'
                        : 'fill-[#483878] dark:fill-slate-100'
                    }`}
                  >
                    {city.name} ({cityTripsCount})
                  </text>
                </g>
              </g>
            );
          })}

          {/* Dynamic Bus Markers Positioned Along Corridors */}
          {visibleBuses.map((bus) => {
            const isHovered = hoveredBus?.trip.id === bus.trip.id;
            const isDelayed = bus.category === 'delayed';

            return (
              <motion.g
                key={bus.trip.id}
                initial={{ x: bus.x, y: bus.y, opacity: 0 }}
                animate={{ x: bus.x, y: bus.y, opacity: 1 }}
                transition={{ duration: 0.75, ease: [0.25, 1, 0.5, 1] }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredBus(bus)}
                onMouseLeave={() => setHoveredBus(null)}
                onClick={() => onSelectTrip?.(bus.trip)}
                role="button"
                tabIndex={0}
                aria-label={`الحافلة ${bus.trip.busId}: ${bus.statusLabel}`}
                onFocus={() => setHoveredBus(bus)}
                onBlur={() => setHoveredBus(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTrip?.(bus.trip);
                  }
                }}
              >
                {isDelayed && (
                  <circle
                    r={18}
                    fill={bus.color}
                    fillOpacity={0.22}
                    className="animate-ping"
                  />
                )}

                <circle
                  r={isHovered ? 16 : 13.5}
                  fill={bus.color}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />

                {/* Bus Icon Inside Marker */}
                <g transform="translate(-7, -7)">
                  <Bus width={14} height={14} className="text-white" strokeWidth={2.2} />
                </g>

                {/* Bus Number Label */}
                <g transform="translate(0, -21)">
                  <rect
                    x={-28}
                    y={-9}
                    width={56}
                    height={17}
                    rx={5}
                    className="fill-white/95 dark:fill-slate-900/95"
                    stroke={bus.color}
                    strokeWidth={1.2}
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    className="fill-[#483878] dark:fill-slate-100 text-[10px] font-mono font-bold"
                  >
                    {bus.trip.busId}
                  </text>
                </g>
              </motion.g>
            );
          })}
        </svg>

        {/* Empty Notice when no trips map to the 3 cities */}
        {visibleBuses.length === 0 && (
          <div className="px-4 py-2.5 border-t border-[#A9DDF5]/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 flex items-center gap-2 text-[13px] font-semibold text-[#444444] dark:text-slate-300">
            <MapPin className="w-4 h-4 text-[#4A9FD8] shrink-0" />
            <span>لا توجد حافلات مطابقة على مسارات جدة ومكة والمدينة حالياً</span>
          </div>
        )}

        {/* Interactive Hover Info Bar */}
        {hoveredBus && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:min-w-[300px] rounded-xl bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md border border-[#A9DDF5] dark:border-slate-600 shadow-lg p-3 flex items-center justify-between gap-3 pointer-events-none"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#483878] text-white font-mono text-[12px] font-bold">
                  {hoveredBus.trip.busId}
                </span>
                <span className="text-[13px] font-bold text-[#483878] dark:text-slate-100 truncate">
                  {hoveredBus.trip.origin} ← {hoveredBus.trip.destination}
                </span>
              </div>
              <p className="text-[12px] text-[#444444] dark:text-slate-300 mt-1 truncate">
                السائق: {formatShortDriverName(hoveredBus.trip.driverName)} ·{' '}
                <span className="font-mono font-bold">
                  {hoveredBus.trip.departureTime} – {hoveredBus.trip.arrivalTime}
                </span>
              </p>
            </div>

            <div className="shrink-0 text-left">
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold text-white"
                style={{ backgroundColor: hoveredBus.color }}
              >
                {hoveredBus.statusLabel}
              </span>
              <div className="text-[12px] font-mono font-bold text-[#483878] dark:text-[#A9DDF5] mt-1">
                {hoveredBus.progressPct}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mock Coordinates & City Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#444444] dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          {cityList.map((city) => (
            <span key={city.id} className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#4A9FD8]" aria-hidden="true" />
              <span className="font-bold text-[#483878] dark:text-slate-200">{city.name}:</span>
              <span dir="ltr" className="font-mono text-[12px]">
                {city.mockCoords}
              </span>
            </span>
          ))}
        </div>
        <span className="text-[12px] text-slate-500 dark:text-slate-400">
          اضغط على أي مدينة لتصفية مساراتها، أو على أي حافلة لعرض تفاصيل الرحلة
        </span>
      </div>
    </section>
  );
};
