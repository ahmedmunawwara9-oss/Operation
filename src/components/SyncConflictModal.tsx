import React from 'react';
import { AlertTriangle, Cloud, HardDrive, GitMerge, CheckCircle2 } from 'lucide-react';
import { Trip, DataSourceType } from '../types';
import { formatUnifiedDateTime } from '../services/dateTimeUtils';

export interface SyncConflictData {
  local: {
    trips: Trip[];
    source: DataSourceType;
    updatedAtMs: number;
    storageOrigin: 'indexeddb' | 'localstorage';
  };
  cloud: {
    trips: Trip[];
    source: DataSourceType;
    updatedAtMs: number;
    updatedByName: string;
  };
  recommended: 'local' | 'cloud';
  diffStats: {
    onlyInLocal: number;
    onlyInCloud: number;
    modified: number;
    timeDiffMinutes: number;
  };
}

interface SyncConflictModalProps {
  conflict: SyncConflictData | null;
  timeZone?: string;
  isApplying?: boolean;
  onChooseCloud: () => void;
  onChooseLocal: () => void;
  onMergeBoth: () => void;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  conflict,
  timeZone = 'Asia/Riyadh',
  isApplying = false,
  onChooseCloud,
  onChooseLocal,
  onMergeBoth,
}) => {
  if (!conflict) return null;

  const { local, cloud, recommended, diffStats } = conflict;
  const localTimeText =
    local.updatedAtMs > 0
      ? formatUnifiedDateTime(new Date(local.updatedAtMs), timeZone)
      : 'غير محدد';
  const cloudTimeText =
    cloud.updatedAtMs > 0
      ? formatUnifiedDateTime(new Date(cloud.updatedAtMs), timeZone)
      : 'غير محدد';

  const localOriginLabel = local.storageOrigin === 'indexeddb' ? 'IndexedDB' : 'localStorage';
  const canMerge = local.trips.length > 0 && cloud.trips.length > 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#483878]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-conflict-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-[#444444] dark:text-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-800/80 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E5A100]/15 border border-[#E5A100]/40 text-[#E5A100] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <h2
              id="sync-conflict-title"
              className="text-base font-black text-[#483878] dark:text-slate-100"
            >
              تأكيد استعادة آخر نسخة صحيحة للجدول
            </h2>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-1 leading-relaxed">
              تم اكتشاف اختلاف كبير بين البيانات المحفوظة محلياً على هذا الجهاز والنسخة السحابية في
              Firestore. اختر النسخة الصحيحة التي ترغب في اعتمادها قبل متابعة المزامنة.
            </p>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Local Version Card */}
            <div
              className={`p-4 rounded-2xl border transition-colors ${
                recommended === 'local'
                  ? 'bg-[#F7FBFE] dark:bg-slate-800/90 border-[#4A9FD8]'
                  : 'bg-white dark:bg-slate-900/60 border-[#A9DDF5] dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#A9DDF5]/50 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#4A9FD8]" />
                  <h3 className="text-sm font-black text-[#483878] dark:text-slate-100">
                    النسخة المحلية
                  </h3>
                </div>
                {recommended === 'local' && (
                  <span className="text-xs font-black text-[#22A06B] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>الأحدث زمنياً</span>
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">عدد الرحلات</span>
                  <span className="font-mono tabular-nums font-black text-[#483878] dark:text-slate-100">
                    {local.trips.length} رحلة
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">آخر تحديث</span>
                  <span className="font-mono tabular-nums font-bold text-[#483878] dark:text-[#A9DDF5]">
                    {localTimeText}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">مصدر التخزين</span>
                  <span className="font-mono font-semibold text-[#4A9FD8]">{localOriginLabel}</span>
                </div>
              </div>
            </div>

            {/* Cloud Version Card */}
            <div
              className={`p-4 rounded-2xl border transition-colors ${
                recommended === 'cloud'
                  ? 'bg-[#F7FBFE] dark:bg-slate-800/90 border-[#4A9FD8]'
                  : 'bg-white dark:bg-slate-900/60 border-[#A9DDF5] dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#A9DDF5]/50 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#483878] dark:text-[#A9DDF5]" />
                  <h3 className="text-sm font-black text-[#483878] dark:text-slate-100">
                    النسخة السحابية (Cloud)
                  </h3>
                </div>
                {recommended === 'cloud' && (
                  <span className="text-xs font-black text-[#22A06B] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>الأحدث زمنياً</span>
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">عدد الرحلات</span>
                  <span className="font-mono tabular-nums font-black text-[#483878] dark:text-slate-100">
                    {cloud.trips.length} رحلة
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">آخر تحديث</span>
                  <span className="font-mono tabular-nums font-bold text-[#483878] dark:text-[#A9DDF5]">
                    {cloudTimeText}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#444444] dark:text-slate-400">آخر تعديل بواسطة</span>
                  <span className="font-semibold text-[#444444] dark:text-slate-200 truncate max-w-[160px]">
                    {cloud.updatedByName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Summary Line */}
          <div className="text-xs text-[#444444] dark:text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 border-t border-[#A9DDF5]/40 dark:border-slate-800">
            <span className="font-bold text-[#483878] dark:text-slate-100">ملخص الاختلاف:</span>
            <span className="font-mono tabular-nums">
              فارق زمني {diffStats.timeDiffMinutes} د
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              رحلات محلية إضافية: {diffStats.onlyInLocal}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              رحلات سحابية إضافية: {diffStats.onlyInCloud}
            </span>
            {diffStats.modified > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  رحلات مختلفة التفاصيل: {diffStats.modified}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {recommended === 'cloud' ? (
              <>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={onChooseCloud}
                  className="min-h-10 px-4 py-2 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] disabled:opacity-50 text-white text-xs font-black shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                >
                  استعادة النسخة السحابية (الأحدث)
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={onChooseLocal}
                  className="min-h-10 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 disabled:opacity-50 text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                >
                  اعتماد النسخة المحلية ورفعها
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={onChooseLocal}
                  className="min-h-10 px-4 py-2 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] disabled:opacity-50 text-white text-xs font-black shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                >
                  اعتماد النسخة المحلية ورفعها (الأحدث)
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={onChooseCloud}
                  className="min-h-10 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 disabled:opacity-50 text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                >
                  استعادة النسخة السحابية
                </button>
              </>
            )}
          </div>

          {canMerge && (
            <button
              type="button"
              disabled={isApplying}
              onClick={onMergeBoth}
              className="min-h-10 px-4 py-2 rounded-xl bg-[#483878] hover:bg-[#3a2d61] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>دمج النسختين</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
