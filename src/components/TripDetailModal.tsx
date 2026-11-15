import React from 'react';
import {
  X,
  Bus,
  User,
  Phone,
  Clock,
  Navigation,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Trip } from '../types';
import { getStatusMeta } from '../services/scheduleEngine';
import { formatDuration } from '../services/dateTimeUtils';

interface TripDetailModalProps {
  trip: Trip | null;
  onClose: () => void;
  onConfirmActualArrival?: (tripId: string) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  onClose,
  onConfirmActualArrival,
}) => {
  if (!trip) return null;

  const statusMeta = getStatusMeta(trip.status);
  const progressPercent = Math.round(trip.progress * 100);
  const hasConflict = trip.conflicts && trip.conflicts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#483878]/45 dark:bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 rounded-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden text-[#444444] dark:text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#483878] dark:text-white">تفاصيل الرحلة {trip.tripNumber}</h2>
                <span className="font-mono text-xs font-bold text-[#483878] dark:text-[#A9DDF5] bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-[#A9DDF5] dark:border-slate-700">
                  {trip.busId}
                </span>
              </div>
              <p className="text-xs text-[#444444] dark:text-slate-300 font-medium">بطاقة الفحص الميداني والتشغيلي المباشر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-[#444444] dark:text-slate-300 font-semibold">الحالة التشغيلية:</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="text-left font-mono">
              <span className="text-[#444444] dark:text-slate-300 font-semibold">نسبة الإنجاز: </span>
              <span className="text-[#483878] dark:text-[#A9DDF5] font-black text-sm">{progressPercent}%</span>
            </div>
          </div>

          {/* Conflict */}
          {hasConflict && (
            <div className="p-4 rounded-2xl bg-[#D92D20]/[0.08] dark:bg-[#D92D20]/15 border border-[#D92D20]/40 space-y-1.5">
              <div className="flex items-center gap-2 text-[#D92D20] dark:text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 text-[#D92D20] dark:text-red-400" />
                <span>تنبيه: تعارض في جدول الرحلة!</span>
              </div>
              {trip.conflicts.map((c, i) => (
                <p key={i} className="text-[#D92D20] dark:text-red-300 text-xs leading-relaxed font-medium">
                  • {c.description} {c.withTripNumber ? `(مع رحلة ${c.withTripNumber})` : ''}
                </p>
              ))}
            </div>
          )}

          {/* Route Section */}
          <div className="p-4 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/60 border border-[#A9DDF5] dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-[#483878] dark:text-slate-100 text-xs flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-[#E8742A]" />
              <span>محطات خط السير</span>
            </h3>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3 rounded-xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 shadow-sm">
                <span className="text-xs text-[#444444] dark:text-slate-300 block mb-1 font-semibold">نقطة الانطلاق (المغادرة)</span>
                <p className="font-extrabold text-[#483878] dark:text-white text-xs">{trip.origin}</p>
                <p className="font-mono text-[#4A9FD8] mt-1 font-bold">
                  الموعد: {trip.departureTime}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 shadow-sm">
                <span className="text-xs text-[#444444] dark:text-slate-300 block mb-1 font-semibold">نقطة الوصول (الوجهة)</span>
                <p className="font-extrabold text-[#483878] dark:text-white text-xs">{trip.destination}</p>
                <p className="font-mono text-[#22A06B] dark:text-emerald-400 mt-1 font-bold">
                  الموعد: {trip.arrivalTime} {trip.isOvernight && '(اليوم التالي)'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs font-semibold text-[#444444] dark:text-slate-300 mb-1.5">
                <span>المدة المجدولة: {formatDuration(trip.durationMinutes, 'ar')}</span>
                <span>المنقضي: {trip.elapsedMinutes} دقيقة · المتبقي: {trip.remainingMinutes} دقيقة</span>
              </div>
              <div className="h-2.5 bg-[#A9DDF5]/40 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-[#483878] to-[#4A9FD8] rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Vehicle and Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 shadow-sm space-y-1.5">
              <h4 className="font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-[#4A9FD8]" />
                <span>بيانات الحافلة</span>
              </h4>
              <div className="space-y-1 text-[#444444] dark:text-slate-300 font-medium">
                <p>رقم الحافلة: <strong className="text-[#483878] dark:text-white font-mono">{trip.busId}</strong></p>
                {trip.plateNumber && <p>رقم اللوحة: <strong className="text-[#483878] dark:text-white">{trip.plateNumber}</strong></p>}
                {trip.passengerCount !== undefined && (
                  <p>عدد الركاب: <strong className="text-[#483878] dark:text-white font-mono">{trip.passengerCount} راكب</strong></p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 shadow-sm space-y-1.5">
              <h4 className="font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#E8742A]" />
                <span>بيانات الكابتن / السائق</span>
              </h4>
              <div className="space-y-1 text-[#444444] dark:text-slate-300 font-medium">
                <p>اسم السائق: <strong className="text-[#483878] dark:text-white">{trip.driverName}</strong></p>
                {trip.driverPhone ? (
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#4A9FD8]" />
                    <span className="font-mono text-[#483878] dark:text-[#A9DDF5] font-bold">{trip.driverPhone}</span>
                  </p>
                ) : (
                  <p className="text-xs text-[#444444] dark:text-slate-400">الهاتف غير مسجل</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {trip.notes && (
            <div className="p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 text-[#444444] dark:text-slate-200 font-medium">
              <span className="text-xs text-[#483878] dark:text-[#A9DDF5] block mb-0.5 font-bold">ملاحظات التشغيل:</span>
              <p>{trip.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-900/60">
          {onConfirmActualArrival &&
            trip.status !== 'completed_actual' &&
            trip.status !== 'completed_scheduled' && (
            <button
              onClick={() => {
                onConfirmActualArrival(trip.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E8742A] hover:bg-[#d5651e] text-white transition-colors shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد وصول الحافلة ميدانياً</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-700 transition-colors ml-auto shadow-sm cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
