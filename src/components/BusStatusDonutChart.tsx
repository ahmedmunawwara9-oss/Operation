import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import 'd3-transition';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Trip } from '../types';

export type BusStatusKey = 'completed' | 'on_road' | 'upcoming';

export interface BusStatusSegment {
  key: BusStatusKey;
  label: string;
  description: string;
  count: number;
  percentage: number;
  color: string;
  darkBgTint: string;
  lightBgTint: string;
}

interface BusStatusDonutChartProps {
  trips: Trip[];
}

interface TooltipState {
  segment: BusStatusSegment;
  x: number;
  y: number;
}

const SVG_SIZE = 248;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 100;
const HOVER_OUTER_RADIUS = 107;
const INNER_RADIUS = 64;

// Keep an explicit reference to d3.transition so Vite/Rollup never tree-shakes selection.prototype.transition
const ensureD3TransitionLoaded = typeof d3.transition === 'function';

export const BusStatusDonutChart: React.FC<BusStatusDonutChartProps> = ({ trips }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slicesGroupRef = useRef<SVGGElement | null>(null);
  const prevAnglesRef = useRef<Map<BusStatusKey, { startAngle: number; endAngle: number }>>(
    new Map()
  );

  const [hoveredKey, setHoveredKey] = useState<BusStatusKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<BusStatusKey | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const activeKey = hoveredKey ?? selectedKey;

  const { segments, classifiedTotal, otherCount } = useMemo(() => {
    const safeTrips = Array.isArray(trips) ? trips.filter(Boolean) : [];
    let completed = 0;
    let onRoad = 0;
    let upcoming = 0;
    let other = 0;

    safeTrips.forEach((trip) => {
      const status = trip?.status;
      if (status === 'completed_scheduled' || status === 'completed_actual') {
        completed += 1;
      } else if (status === 'in_progress_scheduled' || status === 'started_actual') {
        onRoad += 1;
      } else if (status === 'scheduled_upcoming') {
        upcoming += 1;
      } else {
        other += 1;
      }
    });

    const total = completed + onRoad + upcoming;
    const calcPct = (count: number) => {
      if (total <= 0 || !Number.isFinite(count)) return 0;
      const pct = Math.round((count / total) * 1000) / 10;
      return Number.isFinite(pct) ? pct : 0;
    };

    const list: BusStatusSegment[] = [
      {
        key: 'completed',
        label: 'منجزة',
        description: 'رحلات وصلت وأُنهيت بنجاح',
        count: completed,
        percentage: calcPct(completed),
        color: '#22A06B',
        lightBgTint: 'bg-[#22A06B]/10 border-[#22A06B]/30',
        darkBgTint: 'dark:bg-[#22A06B]/15 dark:border-[#22A06B]/40',
      },
      {
        key: 'on_road',
        label: 'على الطريق',
        description: 'حافلات في حالة تشغيل وحركة نشطة',
        count: onRoad,
        percentage: calcPct(onRoad),
        color: '#2E7CF6',
        lightBgTint: 'bg-[#2E7CF6]/10 border-[#2E7CF6]/30',
        darkBgTint: 'dark:bg-[#2E7CF6]/15 dark:border-[#2E7CF6]/40',
      },
      {
        key: 'upcoming',
        label: 'قادمة',
        description: 'رحلات مجدولة بانتظار موعد الانطلاق',
        count: upcoming,
        percentage: calcPct(upcoming),
        color: '#4A9FD8',
        lightBgTint: 'bg-[#4A9FD8]/10 border-[#4A9FD8]/30',
        darkBgTint: 'dark:bg-[#4A9FD8]/15 dark:border-[#4A9FD8]/40',
      },
    ];

    return {
      segments: list,
      classifiedTotal: total,
      otherCount: other,
    };
  }, [trips]);

  const activeSegment = useMemo(
    () => segments.find((s) => s.key === activeKey) ?? null,
    [segments, activeKey]
  );

  // D3 Arc & Pie rendering inside useEffect with full cleanup for React 19 StrictMode
  useEffect(() => {
    const groupEl = slicesGroupRef.current;
    if (!groupEl) return;

    const rootGroup = d3.select(groupEl);
    // Clear previous SVG content & interrupt running transitions on re-run / StrictMode double-mount
    rootGroup.selectAll('*').interrupt();
    rootGroup.selectAll('*').remove();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const visibleSegments = segments.filter((s) => Number.isFinite(s.count) && s.count > 0);

    if (visibleSegments.length === 0) {
      prevAnglesRef.current.clear();
      return;
    }

    const pieGenerator = d3
      .pie<BusStatusSegment>()
      .value((d) => Math.max(0, d.count))
      .sort(null)
      .padAngle(visibleSegments.length > 1 ? 0.032 : 0);

    const baseArc = d3
      .arc<d3.PieArcDatum<BusStatusSegment>>()
      .innerRadius(INNER_RADIUS)
      .outerRadius(OUTER_RADIUS)
      .cornerRadius(6);

    const hoverArc = d3
      .arc<d3.PieArcDatum<BusStatusSegment>>()
      .innerRadius(INNER_RADIUS)
      .outerRadius(HOVER_OUTER_RADIUS)
      .cornerRadius(6);

    const pieData = pieGenerator(visibleSegments);

    const updateTooltipPos = (event: MouseEvent, datum: d3.PieArcDatum<BusStatusSegment>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : SVG_SIZE;
      const height = rect.height > 0 ? rect.height : SVG_SIZE;
      const rawX = event.clientX - rect.left;
      const rawY = event.clientY - rect.top;
      const clampedX = Math.max(76, Math.min(Math.max(76, width - 76), rawX));
      const clampedY = Math.max(48, Math.min(Math.max(48, height - 24), rawY - 14));
      setTooltip({
        segment: datum.data,
        x: clampedX,
        y: clampedY,
      });
    };

    const slices = rootGroup
      .selectAll<SVGPathElement, d3.PieArcDatum<BusStatusSegment>>('path.donut-slice')
      .data(pieData, (d) => d.data.key);

    // Safe exit handling: use d3 transition when patched on Selection.prototype, otherwise remove directly
    const exitSel = slices.exit();
    if (
      ensureD3TransitionLoaded &&
      typeof (exitSel as unknown as { transition?: unknown }).transition === 'function'
    ) {
      exitSel
        .transition()
        .duration(prefersReducedMotion ? 0 : 200)
        .style('opacity', 0)
        .remove();
    } else {
      // Fallback if selection.prototype.transition is unavailable
      exitSel.remove();
    }

    const entered = slices
      .enter()
      .append('path')
      .attr('class', 'donut-slice cursor-pointer outline-none')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.data.label}: ${d.data.count} رحلة (${d.data.percentage}%)`)
      .attr('fill', (d) => d.data.color)
      .style('opacity', 0.96);

    const merged = entered.merge(slices);

    merged
      .attr('fill', (d) => d.data.color)
      .attr('aria-label', (d) => `${d.data.label}: ${d.data.count} رحلة (${d.data.percentage}%)`)
      .on('mouseenter.donut', function (event: MouseEvent, d) {
        setHoveredKey(d.data.key);
        updateTooltipPos(event, d);
      })
      .on('mousemove.donut', function (event: MouseEvent, d) {
        updateTooltipPos(event, d);
      })
      .on('mouseleave.donut', function () {
        setHoveredKey(null);
        setTooltip(null);
      })
      .on('focus.donut', function (_event: FocusEvent, d) {
        setHoveredKey(d.data.key);
      })
      .on('blur.donut', function () {
        setHoveredKey(null);
      })
      .on('click.donut', function (_event: MouseEvent, d) {
        setSelectedKey((prev) => (prev === d.data.key ? null : d.data.key));
      })
      .on('keydown.donut', function (event: KeyboardEvent, d) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSelectedKey((prev) => (prev === d.data.key ? null : d.data.key));
        }
      });

    const canTransitionMerged =
      ensureD3TransitionLoaded &&
      typeof (merged as unknown as { transition?: unknown }).transition === 'function';

    if (canTransitionMerged && !prefersReducedMotion) {
      merged
        .transition()
        .duration(360)
        .ease(d3.easeCubicOut)
        .style('opacity', (d) => (!activeKey || activeKey === d.data.key ? 1 : 0.42))
        .attrTween('d', function (d) {
          const previous = prevAnglesRef.current.get(d.data.key) ?? {
            startAngle: d.startAngle,
            endAngle: d.startAngle,
          };
          const interpolateAngles = d3.interpolate(previous, {
            startAngle: d.startAngle,
            endAngle: d.endAngle,
          });
          const targetArc = activeKey === d.data.key ? hoverArc : baseArc;

          return (t) => {
            const currentAngles = interpolateAngles(t);
            const interpolatedDatum: d3.PieArcDatum<BusStatusSegment> = {
              ...d,
              startAngle: currentAngles.startAngle,
              endAngle: currentAngles.endAngle,
            };
            if (t === 1) {
              prevAnglesRef.current.set(d.data.key, {
                startAngle: d.startAngle,
                endAngle: d.endAngle,
              });
            }
            return targetArc(interpolatedDatum) ?? '';
          };
        });
    } else {
      merged
        .style('opacity', (d) => (!activeKey || activeKey === d.data.key ? 1 : 0.42))
        .attr('d', (d) => {
          prevAnglesRef.current.set(d.data.key, {
            startAngle: d.startAngle,
            endAngle: d.endAngle,
          });
          return (activeKey === d.data.key ? hoverArc(d) : baseArc(d)) ?? '';
        });
    }

    return () => {
      rootGroup.selectAll('*').interrupt();
      rootGroup.selectAll('*').on('.donut', null);
      rootGroup.selectAll('*').remove();
    };
  }, [segments, activeKey]);

  return (
    <div
      ref={containerRef}
      className="relative bg-[#F7FBFE] dark:bg-slate-800/70 p-4 lg:p-5 rounded-2xl border border-[#A9DDF5] dark:border-slate-700"
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-[#483878] dark:text-[#A9DDF5] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-[#483878] dark:text-slate-100">
            توزيع حالات الحافلات (D3 Donut Chart)
          </h3>
        </div>
        <div className="text-xs text-[#444444] dark:text-slate-300 font-mono tabular-nums flex items-center gap-2">
          <span>المصنّفة: {classifiedTotal}</span>
          {otherCount > 0 && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">حالات أخرى: {otherCount}</span>
            </>
          )}
        </div>
      </div>

      {/* Content Layout */}
      {classifiedTotal === 0 ? (
        <div className="py-6 px-3 flex items-center justify-center text-center">
          <p className="text-sm font-semibold text-[#444444] dark:text-slate-300">
            لا توجد بيانات كافية للتحليل حاليًا
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-6">
          {/* D3 SVG Donut Container with explicit non-zero height */}
          <div className="relative h-64 min-h-[16rem] w-full flex items-center justify-center mx-auto">
            <svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              role="img"
              aria-label="مخطط دائري يوضح توزيع حالات الحافلات: منجزة، على الطريق، قادمة"
              className="overflow-visible select-none"
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={(INNER_RADIUS + OUTER_RADIUS) / 2}
                fill="none"
                stroke="currentColor"
                strokeWidth={OUTER_RADIUS - INNER_RADIUS}
                className="text-slate-200/60 dark:text-slate-700/50"
              />
              <g ref={slicesGroupRef} transform={`translate(${CENTER}, ${CENTER})`} />
            </svg>

            {/* Center Readout Overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              {activeSegment ? (
                <>
                  <span
                    className="text-xs font-bold tracking-tight"
                    style={{ color: activeSegment.color }}
                  >
                    {activeSegment.label}
                  </span>
                  <span className="text-2xl font-black font-mono tabular-nums text-[#483878] dark:text-slate-100 leading-tight mt-0.5">
                    {activeSegment.count}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                    {activeSegment.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    إجمالي الحالات
                  </span>
                  <span className="text-3xl font-black font-mono tabular-nums text-[#483878] dark:text-slate-100 leading-tight mt-0.5">
                    {classifiedTotal}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    رحلة
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Breakdown Legend */}
          <div className="space-y-2.5">
            {segments.map((segment) => {
              const isHighlighted = activeKey === segment.key;
              const isDimmed = activeKey !== null && !isHighlighted;
              return (
                <button
                  key={segment.key}
                  type="button"
                  onMouseEnter={() => setHoveredKey(segment.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(segment.key)}
                  onBlur={() => setHoveredKey(null)}
                  onClick={() =>
                    setSelectedKey((prev) => (prev === segment.key ? null : segment.key))
                  }
                  aria-pressed={selectedKey === segment.key}
                  className={`w-full text-right p-3 rounded-xl border transition-all duration-150 cursor-pointer bg-white dark:bg-slate-900/75 ${
                    isHighlighted
                      ? `${segment.lightBgTint} ${segment.darkBgTint} shadow-sm`
                      : 'border-[#A9DDF5]/80 dark:border-slate-700 hover:border-[#4A9FD8]'
                  } ${isDimmed ? 'opacity-65' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-[#483878] dark:text-slate-100">
                          {segment.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {segment.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums">
                      <span className="text-base font-black text-[#483878] dark:text-slate-100">
                        {segment.count}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: segment.color }}
                      >
                        {segment.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Proportional Bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${segment.percentage}%`,
                        backgroundColor: segment.color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating D3 Hover Tooltip */}
      {tooltip && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-[#131C31] text-slate-100 border border-[#4A9FD8]/60 shadow-lg text-xs whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="flex items-center gap-2 font-bold">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: tooltip.segment.color }}
            />
            <span>{tooltip.segment.label}</span>
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-slate-300">
            {tooltip.segment.count} رحلة · {tooltip.segment.percentage}%
          </div>
        </div>
      )}
    </div>
  );
};
