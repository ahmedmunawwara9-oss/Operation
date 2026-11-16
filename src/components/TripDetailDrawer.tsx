import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Bus,
  User,
  Phone,
  Clock,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  FileText,
  ArrowLeft,
  Pencil,
  Ban,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Trip } from '../types';
import { getStatusMeta, hasTripDeparted } from '../services/scheduleEngine';
import {
  buildTripDateTimes,
  formatDuration,
  formatShortDriverName,
  getTodayDateString,
} from '../services/dateTimeUtils';

interface TripDetailDrawerProps {
  trip: Trip | null;
  allTrips: Trip[];
  onClose: () => void;
  onSelectTrip: (trip: Trip) => void;
  onConfirmActualDeparture?: (tripId: string) => void;
  onConfirmActualArrival?: (tripId: string) => void;
  onUpdateTripTimes?: (
    tripId: string,
    updates: { departureTime: string; arrivalTime: string }
  ) => void;
  onCancelTrip?: (tripId: string) => void;
  onRestoreTrip?: (tripId: string) => void;
}

const STANDARD_BUS_CAPACITY = 49;

export const TripDetailDrawer: React.FC<TripDetailDrawerProps> = ({
  trip,
  allTrips,
  onClose,
  onSelectTrip,
  onConfirmActualDeparture,
  onConfirmActualArrival,
  onUpdateTripTimes,
  onCancelTrip,
  onRestoreTrip,
}) => {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editArrivalTime, setEditArrivalTime] = useState('');
  const [timeEditError, setTimeEditError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  useEffect(() => {
    setIsEditingTime(false);
    setIsConfirmingCancel(false);
    setTimeEditError(null);
    setActionFeedback(null);
    if (trip) {
      setEditDepartureTime(trip.departureTime || '00:00');
      setEditArrivalTime(trip.arrivalTime || '00:00');
    }
  }, [trip?.id]);

  useEffect(() => {
    if (!trip) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trip, onClose]);

  const busRelatedTrips = useMemo(() => {
    if (!trip || !trip.busId) return [];
    return allTrips
      .filter((t) => t.busId === trip.busId)
      .sort((a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime());
  }, [trip, allTrips]);

  const totalBusPassengers = useMemo(() => {
    return busRelatedTrips.reduce(
      (sum, t) => sum + (t.status === 'cancelled' ? 0 : t.passengerCount || 0),
      0
    );
  }, [busRelatedTrips]);

  const previewTiming = useMemo(() => {
    if (!trip || !editDepartureTime || !editArrivalTime) return null;
    return buildTripDateTimes(
      trip.tripDate || getTodayDateString(),
      editDepartureTime,
      editArrivalTime,
      true
    );
  }, [trip, editDepartureTime, editArrivalTime]);

  if (!trip) return null;

  const statusMeta = getStatusMeta(trip.status);
  const progressPercent = Math.round(trip.progress * 100);
  const hasConflict = trip.conflicts && trip.conflicts.length > 0;
  const isCancelled = trip.status === 'cancelled';
  const passengers = typeof trip.passengerCount === 'number' ? trip.passengerCount : null;
  const occupancyPercent =
    passengers !== null ? Math.min(100, Math.round((passengers / STANDARD_BUS_CAPACITY) * 100)) : null;

  const handleOpenTimeEditor = () => {
    setEditDepartureTime(trip.departureTime || '00:00');
    setEditArrivalTime(trip.arrivalTime || '00:00');
    setTimeEditError(null);
    setActionFeedback(null);
    setIsConfirmingCancel(false);
    setIsEditingTime(true);
  };

  const handleSaveTimeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateTripTimes) return;
    if (!/^\d{2}:\d{2}$/.test(editDepartureTime) || !/^\d{2}:\d{2}$/.test(editArrivalTime)) {
      setTimeEditError('يرجى إدخال وقت انطلاق ووصول صحيح بصيغة HH:mm.');
      return;
    }
    if (editDepartureTime === editArrivalTime) {
      setTimeEditError('وقت الوصول يجب أن يختلف عن وقت الانطلاق.');
      return;
    }
    onUpdateTripTimes(trip.id, {
      departureTime: editDepartureTime,
      arrivalTime: editArrivalTime,
    });
    setTimeEditError(null);
    setIsEditingTime(false);
    setActionFeedback('تم تحديث وقت الرحلة وحفظه في الجدول.');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#483878]/40 dark:bg-slate-950/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Side Drawer Panel */}
      <aside className="relative z-10 w-full max-w-xl bg-[#F7FBFE] dark:bg-[#0F172A] border-r border-[#A9DDF5] dark:border-slate-700 shadow-2xl h-full flex flex-col overflow-hidden text-[#444444] dark:text-slate-200">
        {/* Header */}
        <div className="p-5 bg-white dark:bg-[#131C31] border-b border-[#A9DDF5] dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#483878] flex items-center justify-center text-white shadow-sm shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="trip-drawer-title"
                  className="text-base font-black text-[#483878] dark:text-white"
                >
                  تفاصيل الرحلة {trip.tripNumber}
                </h2>
                <span className="font-mono tabular-nums text-xs font-bold text-[#4A9FD8]">
                  · {trip.busId}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#444444] dark:text-slate-300 mt-0.5">
                <span className="font-mono tabular-nums">{trip.tripDate}</span>
                <span aria-hidden="true">·</span>
                <span className={`font-bold ${statusMeta.badgeText}`}>{statusMeta.label}</span>
                {trip.isElapsedAtImport &&
                  (trip.status === 'completed_scheduled' || trip.status === 'completed_actual') && (
                    <span
                      title="حُسبت من الجدول المستورد"
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#22A06B]/10 text-[#22A06B] dark:text-emerald-300 border border-[#22A06B]/30 cursor-help"
                    >
                      منجزة تلقائياً
                    </span>
                  )}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-bold text-[#483878] dark:text-[#A9DDF5]">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 p-2 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#EEF7FC] dark:hover:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
            aria-label="إغلاق اللوحة الجانبية"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Quick Management Bar (Edit Time / Cancel or Restore Trip) */}
          {(onUpdateTripTimes || onCancelTrip || onRestoreTrip) && (
            <div className="p-3 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#4A9FD8]" />
                  <span>إدارة حالة ووقت الرحلة</span>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {onUpdateTripTimes && !isCancelled && (
                    <button
                      type="button"
                      onClick={() =>
                        isEditingTime ? setIsEditingTime(false) : handleOpenTimeEditor()
                      }
                      className={`min-h-10 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] ${
                        isEditingTime
                          ? 'bg-[#483878] text-white border-[#483878]'
                          : 'bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-slate-100 border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>تعديل وقت الرحلة</span>
                    </button>
                  )}

                  {onCancelTrip && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTime(false);
                        setActionFeedback(null);
                        setIsConfirmingCancel((prev) => !prev);
                      }}
                      className={`min-h-10 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D20] ${
                        isConfirmingCancel
                          ? 'bg-[#D92D20] text-white border-[#D92D20]'
                          : 'bg-[#D92D20]/[0.08] text-[#D92D20] dark:text-red-300 border-[#D92D20]/35 hover:bg-[#D92D20]/15'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>إلغاء الرحلة</span>
                    </button>
                  )}

                  {onRestoreTrip && isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreTrip(trip.id);
                        setActionFeedback('تمت استعادة الرحلة إلى الجدول النشط.');
                      }}
                      className="min-h-10 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 bg-[#22A06B] hover:bg-[#1b8759] text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22A06B]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استعادة الرحلة للجدول</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Cancel Confirmation Strip */}
              {isConfirmingCancel && !isCancelled && onCancelTrip && (
                <div className="p-3 rounded-xl bg-[#D92D20]/[0.08] dark:bg-[#D92D20]/15 border border-[#D92D20]/40 flex flex-wrap items-center justify-between gap-2.5">
                  <p className="font-bold text-[#D92D20] dark:text-red-300 leading-relaxed">
                    هل أنت متأكد من إلغاء الرحلة {trip.tripNumber}؟ سيتم تحديث الحالة إلى ملغاة وإزالة تعارضاتها.
                  </p>
                  <div className="flex items-center gap-2 mr-auto">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingCancel(false)}
                      className="min-h-10 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-[#444444] dark:text-slate-200 border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                    >
                      تراجع
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCancelTrip(trip.id);
                        setIsConfirmingCancel(false);
                        setActionFeedback('تم إلغاء الرحلة وتحديث الجدول.');
                      }}
                      className="min-h-10 px-4 py-2 rounded-xl text-xs font-black bg-[#D92D20] hover:bg-[#b82218] text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D20]"
                    >
                      تأكيد إلغاء الرحلة
                    </button>
                  </div>
                </div>
              )}

              {/* Action Feedback */}
              {actionFeedback && (
                <div className="p-2.5 rounded-xl bg-[#22A06B]/10 border border-[#22A06B]/30 text-[#22A06B] dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionFeedback}</span>
                </div>
              )}
            </div>
          )}

          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 flex items-center gap-2.5 text-[#444444] dark:text-slate-200 font-bold">
              <Ban className="w-4 h-4 text-[#D92D20] shrink-0" />
              <span>هذه الرحلة ملغاة ولا تدخل في حسابات التعارض أو طاقة التشغيل النشطة.</span>
            </div>
          )}

          {/* Conflict Alert Banner */}
          {hasConflict && !isCancelled && (
            <div className="p-4 rounded-2xl bg-[#D92D20]/[0.08] dark:bg-[#D92D20]/15 border border-[#D92D20]/40 space-y-1.5">
              <div className="flex items-center gap-2 text-[#D92D20] dark:text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>تنبيه تعارض تشغيلي على هذه الرحلة</span>
              </div>
              {trip.conflicts.map((c, i) => (
                <p key={i} className="text-[#D92D20] dark:text-red-300 leading-relaxed font-medium">
                  • {c.description} {c.withTripNumber ? `(مع رحلة ${c.withTripNumber})` : ''}
                </p>
              ))}
            </div>
          )}

          {/* Section 1: Route & Timing Progress */}
          <section className="p-4 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-[#483878] dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#E8742A]" />
                <span>مسار الرحلة والتوقيت</span>
              </h3>
              {trip.route && (
                <span className="text-xs font-semibold text-[#4A9FD8] truncate max-w-[220px]">
                  {trip.route}
                </span>
              )}
            </div>

            {isEditingTime && onUpdateTripTimes ? (
              <form
                onSubmit={handleSaveTimeEdit}
                className="p-3.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/80 border border-[#4A9FD8] space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-trip-departure"
                      className="block text-xs font-bold text-[#483878] dark:text-slate-200 mb-1"
                    >
                      وقت الانطلاق الجديد
                    </label>
                    <input
                      id="edit-trip-departure"
                      type="time"
                      required
                      value={editDepartureTime}
                      onChange={(e) => {
                        setEditDepartureTime(e.target.value);
                        setTimeEditError(null);
                      }}
                      className="w-full min-h-10 bg-white dark:bg-slate-900 font-mono tabular-nums text-xs font-bold text-[#483878] dark:text-white px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-trip-arrival"
                      className="block text-xs font-bold text-[#483878] dark:text-slate-200 mb-1"
                    >
                      وقت الوصول الجديد
                    </label>
                    <input
                      id="edit-trip-arrival"
                      type="time"
                      required
                      value={editArrivalTime}
                      onChange={(e) => {
                        setEditArrivalTime(e.target.value);
                        setTimeEditError(null);
                      }}
                      className="w-full min-h-10 bg-white dark:bg-slate-900 font-mono tabular-nums text-xs font-bold text-[#483878] dark:text-white px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                    />
                  </div>
                </div>

                {previewTiming && (
                  <p className="text-xs font-semibold text-[#444444] dark:text-slate-300 font-mono tabular-nums">
                    المدة بعد التعديل: {formatDuration(previewTiming.durationMinutes, 'ar')}
                    {previewTiming.isOvernight ? ' · تمتد لليوم التالي' : ''}
                  </p>
                )}

                {timeEditError && (
                  <p className="text-xs font-bold text-[#D92D20]">{timeEditError}</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTime(false);
                      setTimeEditError(null);
                    }}
                    className="min-h-10 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-[#444444] dark:text-slate-200 border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="min-h-10 px-4 py-2 rounded-xl text-xs font-black bg-[#483878] hover:bg-[#3a2c63] text-white flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ الوقت الجديد</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/70 dark:border-slate-700">
                  <span className="text-xs text-[#444444] dark:text-slate-400 block mb-1 font-semibold">
                    نقطة الانطلاق
                  </span>
                  <p className="font-extrabold text-[#483878] dark:text-white text-xs leading-snug">
                    {trip.origin}
                  </p>
                  <p className="font-mono tabular-nums text-[#4A9FD8] mt-1 font-bold">
                    {trip.departureTime}
                    {trip.actualDepartureTime ? ` · فعلي ${trip.actualDepartureTime}` : ''}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/70 dark:border-slate-700">
                  <span className="text-xs text-[#444444] dark:text-slate-400 block mb-1 font-semibold">
                    نقطة الوصول
                  </span>
                  <p className="font-extrabold text-[#483878] dark:text-white text-xs leading-snug">
                    {trip.destination}
                  </p>
                  <p className="font-mono tabular-nums text-[#22A06B] dark:text-emerald-400 mt-1 font-bold">
                    {trip.arrivalTime} {trip.isOvernight ? '(اليوم التالي)' : ''}
                    {trip.actualArrivalTime ? ` · فعلي ${trip.actualArrivalTime}` : ''}
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#444444] dark:text-slate-300 mb-1.5">
                <span className="font-mono tabular-nums">
                  المدة: {formatDuration(trip.durationMinutes, 'ar')}
                </span>
                <span className="font-mono tabular-nums">
                  المنقضي {trip.elapsedMinutes} د · المتبقي {trip.remainingMinutes} د
                </span>
              </div>
              <div className="h-2.5 bg-[#A9DDF5]/35 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-[#483878] to-[#4A9FD8] rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Associated Passengers Details */}
          <section className="p-4 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-[#483878] dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#4A9FD8]" />
                <span>الركاب المرتبطون بالرحلة</span>
              </h3>
              <span className="font-mono tabular-nums text-sm font-black text-[#483878] dark:text-white">
                {passengers !== null ? `${passengers} راكب` : 'غير مسجل'}
              </span>
            </div>

            {passengers !== null ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#444444] dark:text-slate-300">
                  <span>نسبة الإشغال التقديرية (سعة قياسية {STANDARD_BUS_CAPACITY} مقعداً)</span>
                  <span className="font-mono tabular-nums font-bold text-[#483878] dark:text-[#A9DDF5]">
                    {occupancyPercent}%
                  </span>
                </div>
                <div className="h-2 bg-[#A9DDF5]/30 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      passengers > STANDARD_BUS_CAPACITY ? 'bg-[#E5A100]' : 'bg-[#22A06B]'
                    }`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/60 dark:border-slate-700">
                    <span className="text-[#444444] dark:text-slate-400 block">ركاب هذه الرحلة</span>
                    <strong className="font-mono tabular-nums text-sm text-[#483878] dark:text-white">
                      {passengers}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/60 dark:border-slate-700">
                    <span className="text-[#444444] dark:text-slate-400 block">
                      إجمالي ركاب الحافلة اليوم
                    </span>
                    <strong className="font-mono tabular-nums text-sm text-[#483878] dark:text-white">
                      {totalBusPassengers}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#444444] dark:text-slate-400 leading-relaxed">
                لم يتم تضمين عمود عدد الركاب لهذه الرحلة في ملف الجدول المستورد.
              </p>
            )}

            {trip.notes && (
              <div className="pt-2.5 border-t border-[#A9DDF5]/50 dark:border-slate-700 flex items-start gap-2 text-xs text-[#444444] dark:text-slate-300">
                <FileText className="w-4 h-4 text-[#4A9FD8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#483878] dark:text-slate-100 block">
                    بيانات وملاحظات المجموعة / الركاب:
                  </span>
                  <p className="mt-0.5 leading-relaxed">{trip.notes}</p>
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Associated Bus & Driver Details */}
          <section className="p-4 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 space-y-3">
            <h3 className="font-black text-[#483878] dark:text-slate-100 text-xs flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-[#483878] dark:text-[#A9DDF5]" />
              <span>تفاصيل الحافلة والكابتن المرتبطة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/70 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">رقم الحافلة</span>
                  <strong className="font-mono text-[#483878] dark:text-white">{trip.busId}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">رقم اللوحة</span>
                  <strong className="font-mono text-[#483878] dark:text-white">
                    {trip.plateNumber || 'غير مسجل'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">الوردية</span>
                  <strong className="text-[#483878] dark:text-white">
                    {trip.shift || 'تشغيل يومي'}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/70 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#483878] dark:text-white font-bold">
                  <User className="w-3.5 h-3.5 text-[#E8742A] shrink-0" />
                  <span className="truncate" title={trip.driverName}>
                    {trip.driverName}
                  </span>
                </div>
                {trip.driverPhone ? (
                  <a
                    href={`tel:${trip.driverPhone}`}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-[#4A9FD8] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{trip.driverPhone}</span>
                  </a>
                ) : (
                  <p className="text-[#444444] dark:text-slate-400">رقم الهاتف غير مسجل</p>
                )}
                {trip.delayMinutes && trip.delayMinutes > 0 ? (
                  <p className="text-[#D92D20] font-bold font-mono tabular-nums">
                    تأخير مسجل: {trip.delayMinutes} دقيقة
                  </p>
                ) : null}
              </div>
            </div>

            {/* Other trips for the same bus on the operational schedule */}
            {busRelatedTrips.length > 0 && (
              <div className="pt-2.5 border-t border-[#A9DDF5]/50 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#4A9FD8]" />
                    <span>الجدول الزمني للحافلة {trip.busId}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[#444444] dark:text-slate-400">
                    {busRelatedTrips.length} رحلة
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pl-1">
                  {busRelatedTrips.map((busTrip) => {
                    const isCurrent = busTrip.id === trip.id;
                    const busTripMeta = getStatusMeta(busTrip.status);
                    return (
                      <button
                        type="button"
                        key={busTrip.id}
                        onClick={() => onSelectTrip(busTrip)}
                        className={`w-full text-right p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] ${
                          isCurrent
                            ? 'bg-[#EEF7FC] dark:bg-slate-800 border-[#4A9FD8]'
                            : 'bg-[#F7FBFE]/70 dark:bg-slate-900/60 border-[#A9DDF5]/60 dark:border-slate-700 hover:border-[#4A9FD8]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#483878] dark:text-white">
                              {busTrip.tripNumber}
                            </span>
                            <span className="font-mono tabular-nums text-[#4A9FD8] font-bold">
                              {busTrip.departureTime} ← {busTrip.arrivalTime}
                            </span>
                          </div>
                          <p className="text-xs text-[#444444] dark:text-slate-300 truncate mt-0.5">
                            {busTrip.origin} ← {busTrip.destination} · {formatShortDriverName(busTrip.driverName)}
                            {busTrip.passengerCount !== undefined ? ` · ${busTrip.passengerCount} راكب` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs font-bold ${busTripMeta.badgeText}`}>
                            {busTripMeta.label}
                          </span>
                          {!isCurrent && <ArrowLeft className="w-3.5 h-3.5 text-[#4A9FD8]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-[#131C31] border-t border-[#A9DDF5] dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {onConfirmActualDeparture &&
            !hasTripDeparted(trip) &&
            trip.status !== 'completed_actual' &&
            trip.status !== 'completed_scheduled' &&
            trip.status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => {
                  onConfirmActualDeparture(trip.id);
                  setActionFeedback('تم تأكيد انطلاق الرحلة وتحديث حركة الأسطول.');
                }}
                className="min-h-10 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#2E7CF6] hover:bg-[#2367d6] text-white transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7CF6]"
              >
                <Navigation className="w-4 h-4" />
                <span>تأكيد انطلاق الرحلة ميدانياً</span>
              </button>
            )}

          {onConfirmActualArrival &&
            trip.status !== 'completed_actual' &&
            trip.status !== 'completed_scheduled' &&
            trip.status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => {
                  onConfirmActualArrival(trip.id);
                  onClose();
                }}
                className="min-h-10 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#22A06B] hover:bg-[#1b8759] text-white transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22A06B]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد وصول الحافلة ميدانياً</span>
              </button>
            )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-5 py-2 rounded-xl text-xs font-bold bg-[#F7FBFE] dark:bg-slate-800 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-700 transition-colors mr-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
          >
            إغلاق
          </button>
        </div>
      </aside>
    </div>
  );
};
