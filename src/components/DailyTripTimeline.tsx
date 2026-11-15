import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Bus,
  AlertTriangle,
  Archive,
  BookmarkPlus,
  CheckCircle2,
  X,
  Navigation,
} from 'lucide-react';
import { Trip, ScheduleArchive } from '../types';
import { getTodayDateString } from '../services/dateTimeUtils';
import {
  AppUser,
  subscribeToScheduleArchives,
  saveScheduleToArchive,
  loadLocalAutoArchives,
} from '../services/firebase';
import { ReportExportButtons } from './ReportExportButtons';
import { ScheduleArchivePanel } from './ScheduleArchivePanel';
import { RouteGanttView } from './RouteGanttView';
import {
  TripHoverTooltip,
  HoveredTripState,
  buildHoveredTripState,
} from './TripHoverTooltip';

interface DailyTripTimelineProps {
  trips: Trip[];
  currentTime: Date;
  onSelectTrip: (trip: Trip) => void;
  enableArchive?: boolean;
  currentUser?: AppUser | null;
  onRestoreArchive?: (trips: Trip[]) => void;
  autoArchiveNotice?: { count: number; timestamp: number } | null;
  onDismissAutoArchiveNotice?: () => void;
}

export const DailyTripTimeline: React.FC<DailyTripTimelineProps> = ({
  trips,
  currentTime,
  onSelectTrip,
  enableArchive = false,
  currentUser = null,
  onRestoreArchive,
  autoArchiveNotice = null,
  onDismissAutoArchiveNotice,
}) => {
  const [subTab, setSubTab] = useState<'timeline' | 'archive'>('timeline');
  const [ganttMode, setGanttMode] = useState<'bus' | 'route'>('bus');
  const [busFilter, setBusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTrip, setHoveredTrip] = useState<HoveredTripState | null>(null);

  useEffect(() => {
    if (!hoveredTrip) return;
    const clearTooltip = () => setHoveredTrip(null);
    window.addEventListener('scroll', clearTooltip, true);
    return () => window.removeEventListener('scroll', clearTooltip, true);
  }, [hoveredTrip]);

  // Archive states
  const [cloudArchives, setCloudArchives] = useState<ScheduleArchive[]>([]);
  const [localArchives, setLocalArchives] = useState<ScheduleArchive[]>(() => loadLocalAutoArchives());
  const [archivesLoading, setArchivesLoading] = useState<boolean>(false);
  const [archivesError, setArchivesError] = useState<string | null>(null);
  const [isSaveFormOpen, setIsSaveFormOpen] = useState<boolean>(false);
  const [archiveTitle, setArchiveTitle] = useState<string>('');
  const [archiveDate, setArchiveDate] = useState<string>('');
  const [archiveNotes, setArchiveNotes] = useState<string>('');
  const [isSavingArchive, setIsSavingArchive] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    setLocalArchives(loadLocalAutoArchives());
  }, [autoArchiveNotice, subTab, trips.length]);

  useEffect(() => {
    if (!enableArchive || !currentUser) return;
    setArchivesLoading(true);
    const unsubscribe = subscribeToScheduleArchives(
      (list) => {
        setCloudArchives(list);
        setArchivesLoading(false);
        setArchivesError(null);
      },
      (err) => {
        setArchivesLoading(false);
        setArchivesError(err.message || 'تعذر تحميل جداول الأرشيف من قاعدة البيانات.');
      }
    );
    return () => unsubscribe();
  }, [enableArchive, currentUser]);

  const archives = React.useMemo(() => {
    const merged = [...cloudArchives, ...localArchives];
    merged.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return merged;
  }, [cloudArchives, localArchives]);

  const openSaveArchiveForm = () => {
    const defaultDate = trips[0]?.tripDate || getTodayDateString();
    setArchiveTitle(`جدول تشغيل ${defaultDate}`);
    setArchiveDate(defaultDate);
    setArchiveNotes('');
    setSaveFeedback(null);
    setIsSaveFormOpen(true);
  };

  const handleSaveToArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSavingArchive(true);
    setSaveFeedback(null);
    try {
      await saveScheduleToArchive({
        title: archiveTitle,
        scheduleDate: archiveDate,
        notes: archiveNotes,
        trips,
        createdByName: currentUser.displayName,
      });
      setIsSaveFormOpen(false);
      setSaveFeedback({
        type: 'success',
        text: 'تم حفظ جدول الرحلات بنجاح في الأرشيف.',
      });
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حفظ الجدول في الأرشيف.',
      });
    } finally {
      setIsSavingArchive(false);
    }
  };

  const handleRestoreFromArchive = (archive: ScheduleArchive) => {
    if (!onRestoreArchive) return;
    onRestoreArchive(archive.trips);
    setSubTab('timeline');
    setSaveFeedback({
      type: 'success',
      text: `تم تحميل جدول «${archive.title}» إلى الجدول النشط بنجاح.`,
    });
  };

  const getTripRouteLabel = (t: Trip) => {
    const explicit = (t.route || '').trim();
    if (explicit) return explicit;
    return `${(t.origin || '').trim() || 'نقطة الانطلاق'} ← ${(t.destination || '').trim() || 'الوجهة'}`;
  };

  const uniqueBuses = Array.from(new Set(trips.map((t) => t.busId).filter(Boolean))).sort();
  const uniqueDrivers = Array.from(new Set(trips.map((t) => t.driverName).filter(Boolean))).sort();
  const uniqueRoutes = Array.from(new Set(trips.map(getTripRouteLabel))).sort((a, b) =>
    a.localeCompare(b, 'ar')
  );

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentFraction = (currentHour * 60 + currentMinute) / 1440;
  const currentTimePercent = Math.min(100, Math.max(0, currentFraction * 100));

  const filteredTrips = trips.filter((t) => {
    if (busFilter !== 'all' && t.busId !== busFilter) return false;
    if (driverFilter !== 'all' && t.driverName !== driverFilter) return false;
    if (routeFilter !== 'all' && getTripRouteLabel(t) !== routeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.tripNumber.toLowerCase().includes(q) ||
        t.busId.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        (t.route || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const groupedByBus: Record<string, Trip[]> = {};
  filteredTrips.forEach((trip) => {
    const key = trip.busId || 'حافلة غير محددة';
    if (!groupedByBus[key]) groupedByBus[key] = [];
    groupedByBus[key].push(trip);
  });

  const calculateBarPosition = (trip: Trip) => {
    const [dHour, dMin] = trip.departureTime.split(':').map((n) => parseInt(n, 10) || 0);
    const [aHour, aMin] = trip.arrivalTime.split(':').map((n) => parseInt(n, 10) || 0);

    const startMinutes = dHour * 60 + dMin;
    let endMinutes = aHour * 60 + aMin;

    if (trip.isOvernight) {
      endMinutes += 1440;
    }

    const durationMin = Math.max(20, endMinutes - startMinutes);
    const leftPercent = (startMinutes / 1440) * 100;
    const widthPercent = (durationMin / 1440) * 100;

    return {
      leftPercent: Math.min(99, Math.max(0, leftPercent)),
      widthPercent: Math.min(100 - leftPercent, Math.max(1.5, widthPercent)),
    };
  };

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="w-full bg-white/95 dark:bg-[#131C31]/95 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-5 lg:p-6 shadow-sm">
      {/* Timeline Header & Sub-tabs */}
      <div className="flex flex-col gap-3.5 pb-4 border-b border-[#A9DDF5]/60 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-black text-[#483878] dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>جدول الرحلات والمخطط الزمني (Gantt)</span>
                <span className="text-xs font-mono font-bold bg-[#F7FBFE] dark:bg-slate-800 text-[#4A9FD8] dark:text-[#A9DDF5] px-2.5 py-0.5 rounded-full border border-[#A9DDF5] dark:border-slate-700">
                  12:00 ص – 00:00 ليلاً
                </span>
              </h2>
              <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5">
                اليوم التشغيلي يبدأ 12:00 ص (00:00) وينتهي 00:00 ليلاً · تُنقل الرحلات المنتهية تلقائياً إلى الأرشيف
              </p>
            </div>
          </div>

          {/* Sub-tabs (المخطط الزمني / الأرشيف) + Save to Archive Button */}
          {enableArchive && (
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-1 bg-[#F7FBFE] dark:bg-slate-800 p-1 rounded-xl border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSubTab('timeline')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    subTab === 'timeline'
                      ? 'bg-[#E8742A] text-white shadow-sm font-black'
                      : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>الجدول الحالي ({trips.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('archive')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    subTab === 'archive'
                      ? 'bg-[#483878] text-white shadow-sm font-black'
                      : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>الأرشيف</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-mono text-xs font-black ${
                      subTab === 'archive'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#A9DDF5]/35 dark:bg-slate-700 text-[#483878] dark:text-[#A9DDF5]'
                    }`}
                  >
                    {archives.length}
                  </span>
                </button>
              </div>

              {trips.length > 0 && subTab === 'timeline' && (
                <button
                  type="button"
                  onClick={openSaveArchiveForm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] text-white text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>حفظ في الأرشيف</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inline Save-to-Archive Form */}
        {enableArchive && isSaveFormOpen && (
          <form
            onSubmit={handleSaveToArchive}
            className="p-4 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/80 border border-[#4A9FD8] shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#483878] dark:text-slate-100">
                <BookmarkPlus className="w-4 h-4 text-[#E8742A]" />
                <span>حفظ جدول الرحلات الحالي ({trips.length} رحلة) في الأرشيف</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveFormOpen(false)}
                className="p-1 rounded-lg text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#483878] dark:text-slate-200 mb-1">
                  اسم / عنوان الجدول *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={archiveTitle}
                  onChange={(e) => setArchiveTitle(e.target.value)}
                  placeholder="مثال: جدول تشغيل الفترة المسائية"
                  className="w-full bg-white dark:bg-slate-900 text-xs text-[#444444] dark:text-slate-100 font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#483878] dark:text-slate-200 mb-1">
                  تاريخ التشغيل *
                </label>
                <input
                  type="date"
                  required
                  value={archiveDate}
                  onChange={(e) => setArchiveDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 text-xs text-[#444444] dark:text-slate-100 font-mono font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#483878] dark:text-slate-200 mb-1">
                  ملاحظات (اختياري)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={archiveNotes}
                  onChange={(e) => setArchiveNotes(e.target.value)}
                  placeholder="ملاحظات تشغيلية حول الجدول..."
                  className="w-full bg-white dark:bg-slate-900 text-xs text-[#444444] dark:text-slate-100 font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSaveFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold text-[#444444] dark:text-slate-200 hover:text-[#483878] dark:hover:text-white cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSavingArchive}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] disabled:opacity-50 text-white text-xs font-black shadow-sm cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>{isSavingArchive ? 'جارٍ الحفظ...' : 'تأكيد الحفظ في الأرشيف'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Auto-archive notification banner */}
        {autoArchiveNotice && autoArchiveNotice.count > 0 && subTab === 'timeline' && (
          <div className="p-3 rounded-xl border bg-[#22A06B]/10 border-[#22A06B]/35 text-[#22A06B] flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                تم نقل {autoArchiveNotice.count} رحلة منتهية تلقائياً إلى الأرشيف.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubTab('archive');
                  onDismissAutoArchiveNotice?.();
                }}
                className="px-3 py-1 rounded-lg bg-[#483878] text-white text-xs font-black cursor-pointer"
              >
                فتح الأرشيف
              </button>
              {onDismissAutoArchiveNotice && (
                <button
                  type="button"
                  onClick={onDismissAutoArchiveNotice}
                  className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                  aria-label="إغلاق التنبيه"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save / Restore Feedback Banner */}
        {saveFeedback && (
          <div
            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
              saveFeedback.type === 'success'
                ? 'bg-[#22A06B]/10 border-[#22A06B]/35 text-[#22A06B]'
                : 'bg-[#D92D20]/10 border-[#D92D20]/35 text-[#D92D20]'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{saveFeedback.text}</span>
            </div>
            <div className="flex items-center gap-2">
              {saveFeedback.type === 'success' && subTab === 'timeline' && (
                <button
                  type="button"
                  onClick={() => setSubTab('archive')}
                  className="px-3 py-1 rounded-lg bg-[#483878] text-white text-xs font-black cursor-pointer"
                >
                  فتح الأرشيف
                </button>
              )}
              <button
                type="button"
                onClick={() => setSaveFeedback(null)}
                className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Filters Row (shown only in Timeline view) */}
        {subTab === 'timeline' && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            {/* Group-by Mode Switcher (By Bus vs By Route) */}
            <div className="flex items-center gap-1 bg-[#F7FBFE] dark:bg-slate-800 p-1 rounded-xl border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGanttMode('bus')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  ganttMode === 'bus'
                    ? 'bg-[#483878] text-white shadow-sm font-black'
                    : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>حسب الحافلة</span>
              </button>
              <button
                type="button"
                onClick={() => setGanttMode('route')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  ganttMode === 'route'
                    ? 'bg-[#E8742A] text-white shadow-sm font-black'
                    : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>حسب المسار</span>
              </button>
            </div>

            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
              className="bg-[#F7FBFE] dark:bg-slate-800 text-xs text-[#444444] dark:text-slate-200 font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
            >
              <option value="all">جميع الحافلات ({uniqueBuses.length})</option>
              {uniqueBuses.map((bus) => (
                <option key={bus} value={bus}>
                  {bus}
                </option>
              ))}
            </select>

            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="bg-[#F7FBFE] dark:bg-slate-800 text-xs text-[#444444] dark:text-slate-200 font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none max-w-[150px] truncate"
            >
              <option value="all">جميع السائقين ({uniqueDrivers.length})</option>
              {uniqueDrivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </select>

            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="bg-[#F7FBFE] dark:bg-slate-800 text-xs text-[#444444] dark:text-slate-200 font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none max-w-[180px] truncate"
            >
              <option value="all">جميع المسارات ({uniqueRoutes.length})</option>
              {uniqueRoutes.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#4A9FD8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المخطط..."
                className="bg-[#F7FBFE] dark:bg-slate-800 text-xs text-[#444444] dark:text-slate-100 pr-8 pl-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none w-36 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>

            <div className="mr-auto">
              <ReportExportButtons
                trips={filteredTrips}
                currentTime={currentTime}
                compact
                filterLabel={
                  busFilter !== 'all' || driverFilter !== 'all' || routeFilter !== 'all' || searchQuery.trim()
                    ? 'الرحلات المصفاة في جدول الرحلات'
                    : 'جميع رحلات الجدول اليومي'
                }
              />
            </div>
          </div>
        )}
      </div>

      {subTab === 'archive' && enableArchive ? (
        <div className="mt-4">
          <ScheduleArchivePanel
            archives={archives}
            isLoading={archivesLoading}
            error={archivesError}
            currentUser={currentUser}
            hasActiveTrips={trips.length > 0}
            onRestoreArchive={handleRestoreFromArchive}
            onArchiveDeleted={() => setLocalArchives(loadLocalAutoArchives())}
            currentTime={currentTime}
          />
        </div>
      ) : (
        <>
          {/* Legend (Strictly Separated Status Colors) */}
          <div className="flex flex-wrap items-center gap-4 py-2.5 text-xs text-[#444444] dark:text-slate-300 border-b border-[#A9DDF5]/50 dark:border-slate-700">
            <span className="font-bold text-[#483878] dark:text-slate-100">دليل الألوان:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-[#4A9FD8]" />
              <span>رحلة قادمة</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-[#2E7CF6]" />
              <span>جاري التنفيذ (متحركة)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-[#22A06B]" />
              <span>مكتملة / منتهية</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-[#E5A100]" />
              <span>تجاوز الموعد (تحذير)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-[#D92D20]" />
              <span>تعارض أو تأخير حرج</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-ping" />
              <span className="text-[#D92D20] font-bold">الخط الأحمر = الوقت الحالي</span>
            </div>
          </div>

      {ganttMode === 'route' ? (
        <RouteGanttView
          trips={filteredTrips}
          currentTime={currentTime}
          currentTimePercent={currentTimePercent}
          onSelectTrip={onSelectTrip}
        />
      ) : (
      /* Gantt Chart Matrix (By Bus) */
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[950px] relative">
          {/* Time axis header */}
          <div className="flex border-b border-[#A9DDF5] dark:border-slate-700 pb-2 text-xs font-mono font-bold text-[#444444] dark:text-slate-300">
            <div className="w-32 shrink-0 pr-2 font-bold text-[#483878] dark:text-slate-100 text-xs">الحافلة</div>
            <div className="flex-1 relative flex justify-between">
              {hours.filter((h) => h % 2 === 0).map((hour) => (
                <div key={hour} className="text-center">
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows Container */}
          <div className="relative py-2 space-y-2.5">
            {/* Red Moving Current Time Line */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
              style={{
                left: `calc(8rem + (100% - 8rem) * ${currentTimePercent / 100})`,
              }}
            >
              <div className="w-0.5 h-full bg-[#D92D20] shadow-sm" />
              <div className="bg-[#D92D20] text-white font-mono text-xs px-1.5 py-0.5 rounded-md shadow-sm absolute -top-4 font-bold whitespace-nowrap">
                {currentTime.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>

            {/* Vertical grid lines */}
            <div className="absolute inset-y-0 right-0 left-32 flex justify-between pointer-events-none opacity-25">
              {hours.filter((h) => h % 2 === 0).map((hour) => (
                <div key={hour} className="w-px h-full bg-[#4A9FD8]" />
              ))}
            </div>

            {/* Bus Rows */}
            {Object.keys(groupedByBus).length === 0 ? (
              <div className="py-10 text-center text-xs text-[#444444] dark:text-slate-300 font-medium">
                لا توجد رحلات مطابقة للمعايير
              </div>
            ) : (
              Object.entries(groupedByBus).map(([busId, busTrips]) => {
                const hasBusConflict = busTrips.some(
                  (t) => t.conflicts && t.conflicts.some((c) => c.type === 'bus_overlap')
                );

                return (
                  <div
                    key={busId}
                    className="flex items-center h-10 hover:bg-[#EEF7FC] dark:hover:bg-slate-800/70 rounded-xl transition-colors group relative"
                  >
                    {/* Bus Label */}
                    <div className="w-32 shrink-0 pr-2 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-[#4A9FD8] shrink-0" />
                      <span className="font-mono text-xs font-bold text-[#483878] dark:text-slate-100 truncate">
                        {busId}
                      </span>
                      {hasBusConflict && (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#D92D20] shrink-0" />
                      )}
                    </div>

                    {/* Timeline bar track */}
                    <div className="flex-1 h-7 bg-[#F7FBFE] dark:bg-slate-800 rounded-lg relative overflow-hidden border border-[#A9DDF5] dark:border-slate-700">
                      {busTrips.map((trip) => {
                        const { leftPercent, widthPercent } = calculateBarPosition(trip);
                        const hasConflict = trip.conflicts && trip.conflicts.length > 0;

                        let barBg = 'bg-[#4A9FD8] text-white';
                        if (hasConflict) barBg = 'bg-[#D92D20] text-white';
                        else if (trip.status === 'in_progress_scheduled' || trip.status === 'started_actual')
                          barBg = 'bg-[#2E7CF6] text-white';
                        else if (trip.status === 'completed_scheduled' || trip.status === 'completed_actual')
                          barBg = 'bg-[#22A06B] text-white';
                        else if (trip.status === 'needs_confirmation') barBg = 'bg-[#E5A100] text-white';
                        else if (trip.status === 'delayed_confirmed') barBg = 'bg-[#D92D20] text-white';

                        return (
                          <button
                            type="button"
                            key={trip.id}
                            onClick={() => {
                              setHoveredTrip(null);
                              onSelectTrip(trip);
                            }}
                            onMouseEnter={(e) =>
                              setHoveredTrip(buildHoveredTripState(e.currentTarget, trip))
                            }
                            onMouseLeave={() => setHoveredTrip(null)}
                            onFocus={(e) =>
                              setHoveredTrip(buildHoveredTripState(e.currentTarget, trip))
                            }
                            onBlur={() => setHoveredTrip(null)}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            aria-label={`${trip.tripNumber} - حافلة ${trip.busId} - ${trip.driverName}`}
                            className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-xs font-bold cursor-pointer shadow-sm transition-transform hover:scale-y-110 hover:z-30 outline-none focus-visible:ring-2 focus-visible:ring-[#483878] ${barBg}`}
                          >
                            <span className="truncate">{trip.tripNumber}</span>
                            <span className="font-mono text-xs opacity-95 hidden sm:inline">
                              {trip.departureTime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}
        </>
      )}

      <TripHoverTooltip hovered={hoveredTrip} />
    </div>
  );
};
