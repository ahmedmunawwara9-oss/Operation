import React, { useMemo, useState } from 'react';
import {
  Clock,
  Bus,
  Users,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
} from 'lucide-react';
import { Trip } from '../types';
import { getStatusMeta } from '../services/scheduleEngine';
import {
  formatDuration,
  formatShortDriverName,
  getRelativeTimeText,
  formatUnifiedTime,
} from '../services/dateTimeUtils';

interface TimelineViewProps {
  trips: Trip[];
  currentTime: Date;
  selectedTripId?: string | null;
  onSelectTrip: (trip: Trip) => void;
}

type TimelineFilter = 'all' | 'active' | 'upcoming' | 'delayed' | 'completed';

export const TimelineView: React.FC<TimelineViewProps> = ({
  trips,
  currentTime,
  selectedTripId = null,
  onSelectTrip,
}) => {
  const [statusFilter, setStatusFilter] = useState<TimelineFilter>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const counts = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let delayed = 0;
    let completed = 0;
    for (const t of trips) {
      if (t.status === 'in_progress_scheduled' || t.status === 'started_actual') active++;
      else if (t.status === 'scheduled_upcoming') upcoming++;
      else if (
        t.status === 'delayed_confirmed' ||
        t.status === 'needs_confirmation' ||
        t.status === 'conflict' ||
        (t.conflicts && t.conflicts.length > 0)
      ) {
        delayed++;
      } else if (t.status === 'completed_actual' || t.status === 'completed_scheduled') {
        completed++;
      }
    }
    return { all: trips.length, active, upcoming, delayed, completed };
  }, [trips]);

  const sortedFilteredTrips = useMemo(() => {
    const filtered = trips.filter((t) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') {
        return t.status === 'in_progress_scheduled' || t.status === 'started_actual';
      }
      if (statusFilter === 'upcoming') {
        return t.status === 'scheduled_upcoming';
      }
      if (statusFilter === 'delayed') {
        return (
          t.status === 'delayed_confirmed' ||
          t.status === 'needs_confirmation' ||
          t.status === 'conflict' ||
          (t.conflicts && t.conflicts.length > 0)
        );
      }
      if (statusFilter === 'completed') {
        return t.status === 'completed_actual' || t.status === 'completed_scheduled';
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.departureDateTime).getTime();
      const timeB = new Date(b.departureDateTime).getTime();
      if (timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return (a.tripNumber || '').localeCompare(b.tripNumber || '');
    });
  }, [trips, statusFilter, sortOrder]);

  const currentTimeMs = currentTime.getTime();
  const currentTimeLabel = formatUnifiedTime(currentTime);

  // Index at which the live "الآن" marker should sit chronologically
  const nowInsertIndex = useMemo(() => {
    if (sortedFilteredTrips.length === 0) return -1;
    if (sortOrder === 'asc') {
      return sortedFilteredTrips.findIndex(
        (t) => new Date(t.departureDateTime).getTime() >= currentTimeMs
      );
    }
    return sortedFilteredTrips.findIndex(
      (t) => new Date(t.departureDateTime).getTime() <= currentTimeMs
    );
  }, [sortedFilteredTrips, currentTimeMs, sortOrder]);

  const renderNowMarker = () => (
    <div className="flex items-center gap-3 py-1.5" key="timeline-now-marker">
      <div className="w-16 shrink-0 text-left font-mono tabular-nums text-xs font-black text-[#D92D20]">
        {currentTimeLabel}
      </div>
      <div className="w-4 flex justify-center shrink-0">
        <span className="w-3 h-3 rounded-full bg-[#D92D20] ring-4 ring-[#D92D20]/20" />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs font-black text-[#D92D20]">الوقت الحالي الآن</span>
        <div className="flex-1 h-px bg-[#D92D20]/50" />
      </div>
    </div>
  );

  return (
    <div className="mt-4 space-y-3.5">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700">
        {/* Segmented Status Filter */}
        <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-[#131C31] p-1 rounded-xl border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold">
          {(
            [
              { id: 'all', label: 'الكل', count: counts.all },
              { id: 'active', label: 'جارية', count: counts.active },
              { id: 'upcoming', label: 'قادمة', count: counts.upcoming },
              { id: 'delayed', label: 'تأخير وتعارض', count: counts.delayed },
              { id: 'completed', label: 'منتهية', count: counts.completed },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`min-h-8 px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] ${
                statusFilter === item.id
                  ? 'bg-[#483878] text-white shadow-sm font-black'
                  : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              <span className="font-mono tabular-nums opacity-85">({item.count})</span>
            </button>
          ))}
        </div>

        {/* Chronological Order Toggle */}
        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          className="min-h-9 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold text-[#483878] dark:text-slate-100 hover:border-[#4A9FD8] flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#4A9FD8]" />
          <span>{sortOrder === 'asc' ? 'الأبكر أولاً' : 'الأحدث أولاً'}</span>
        </button>
      </div>

      {/* Vertical Chronological Timeline Stream */}
      {sortedFilteredTrips.length === 0 ? (
        <div className="py-12 px-4 text-center bg-[#F7FBFE] dark:bg-slate-800/50 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <Clock className="w-9 h-9 text-[#4A9FD8] mx-auto mb-2" />
          <p className="text-sm font-black text-[#483878] dark:text-slate-100">
            لا توجد رحلات في هذا التصنيف حالياً
          </p>
          <p className="text-xs text-[#444444] dark:text-slate-300 mt-1">
            انقر على أي رحلة بعد استيراد الجدول لعرض تفاصيل الحافلة والركاب في اللوحة الجانبية
          </p>
        </div>
      ) : (
        <div className="relative pr-1">
          <div className="space-y-2.5">
            {sortedFilteredTrips.map((trip, idx) => {
              const meta = getStatusMeta(trip.status);
              const isSelected = selectedTripId === trip.id;
              const isCancelled = trip.status === 'cancelled';
              const hasConflict = !isCancelled && trip.conflicts && trip.conflicts.length > 0;
              const depDateObj = new Date(trip.departureDateTime);
              const relText = isCancelled
                ? 'رحلة ملغاة'
                : getRelativeTimeText(depDateObj, currentTime, true, 'ar');

              return (
                <React.Fragment key={trip.id}>
                  {idx === nowInsertIndex && renderNowMarker()}

                  <div className={`flex items-stretch gap-3 group ${isCancelled ? 'opacity-70' : ''}`}>
                    {/* Departure Time Column */}
                    <div className="w-16 shrink-0 pt-3 text-left">
                      <div
                        className={`font-mono tabular-nums text-sm font-black leading-none ${
                          isCancelled
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-[#483878] dark:text-slate-100'
                        }`}
                      >
                        {trip.departureTime}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-xs mt-1 ${
                          isCancelled
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-[#444444] dark:text-slate-400'
                        }`}
                      >
                        ← {trip.arrivalTime}
                      </div>
                    </div>

                    {/* Vertical Timeline Rail & Node */}
                    <div className="w-4 flex flex-col items-center shrink-0">
                      <div
                        className="w-3 h-3 rounded-full mt-3.5 shrink-0 ring-4 ring-white dark:ring-[#131C31]"
                        style={{ backgroundColor: meta.colorHex }}
                      />
                      {idx < sortedFilteredTrips.length - 1 && (
                        <div className="w-0.5 flex-1 bg-[#A9DDF5] dark:bg-slate-700 mt-1" />
                      )}
                    </div>

                    {/* Clickable Trip Card (opens Side Drawer) */}
                    <button
                      type="button"
                      onClick={() => onSelectTrip(trip)}
                      className={`flex-1 text-right p-3.5 rounded-2xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] ${
                        isSelected
                          ? 'bg-[#EEF7FC] dark:bg-slate-800 border-[#4A9FD8] shadow-sm'
                          : 'bg-white dark:bg-[#131C31] border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8] hover:bg-[#F7FBFE] dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-black text-sm text-[#483878] dark:text-white">
                              رحلة {trip.tripNumber}
                            </span>
                            <span aria-hidden="true" className="text-[#A9DDF5] dark:text-slate-600">
                              ·
                            </span>
                            <span className="font-bold" style={{ color: meta.colorHex }}>
                              {meta.label}
                            </span>
                            {trip.isElapsedAtImport &&
                              (trip.status === 'completed_scheduled' || trip.status === 'completed_actual') && (
                                <span
                                  title="حُسبت من الجدول المستورد"
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#22A06B]/10 text-[#22A06B] dark:text-emerald-300 border border-[#22A06B]/30 cursor-help"
                                >
                                  منجزة تلقائياً
                                </span>
                              )}
                            {hasConflict && (
                              <span className="inline-flex items-center gap-1 font-bold text-[#D92D20]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>تعارض</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm font-extrabold text-[#483878] dark:text-slate-100 mt-1 truncate">
                            {trip.origin} ← {trip.destination}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A9FD8] shrink-0">
                          <span>تفاصيل الحافلة والركاب</span>
                          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                      </div>

                      {/* Quiet Unboxed Metadata Row */}
                      <div className="mt-2 pt-2 border-t border-[#A9DDF5]/40 dark:border-slate-700/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#444444] dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[#483878] dark:text-[#A9DDF5]">
                          <Bus className="w-3.5 h-3.5 text-[#4A9FD8]" />
                          <span>{trip.busId}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>السائق: {formatShortDriverName(trip.driverName)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold">
                          <Users className="w-3.5 h-3.5 text-[#4A9FD8]" />
                          <span>
                            {trip.passengerCount !== undefined
                              ? `${trip.passengerCount} راكب`
                              : 'الركاب غير مسجل'}
                          </span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          المدة {formatDuration(trip.durationMinutes, 'ar')}
                        </span>
                        <span className="mr-auto font-medium text-[#4A9FD8]">{relText}</span>
                      </div>
                    </button>
                  </div>
                </React.Fragment>
              );
            })}

            {nowInsertIndex === -1 && renderNowMarker()}
          </div>
        </div>
      )}
    </div>
  );
};
