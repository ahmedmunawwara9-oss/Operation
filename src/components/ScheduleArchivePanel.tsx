import React, { useState, useMemo } from 'react';
import {
  Archive,
  Calendar,
  Clock,
  Bus,
  CheckCircle2,
  Eye,
  RotateCcw,
  Trash2,
  Search,
  UserCheck,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { ScheduleArchive, Trip } from '../types';
import { AppUser, deleteScheduleArchive } from '../services/firebase';
import { getStatusMeta } from '../services/scheduleEngine';
import { formatUnifiedDateTime, formatShortDriverName } from '../services/dateTimeUtils';
import { ReportExportButtons } from './ReportExportButtons';

interface ScheduleArchivePanelProps {
  archives: ScheduleArchive[];
  isLoading: boolean;
  error: string | null;
  currentUser: AppUser | null;
  hasActiveTrips: boolean;
  onRestoreArchive: (archive: ScheduleArchive) => void;
  onArchiveDeleted?: (archiveId: string) => void;
  currentTime: Date;
}

export const ScheduleArchivePanel: React.FC<ScheduleArchivePanelProps> = ({
  archives,
  isLoading,
  error,
  currentUser,
  hasActiveTrips,
  onRestoreArchive,
  onArchiveDeleted,
  currentTime,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewArchive, setPreviewArchive] = useState<ScheduleArchive | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredArchives = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return archives;
    return archives.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.scheduleDate.toLowerCase().includes(q) ||
        a.createdByName.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q))
    );
  }, [archives, searchQuery]);

  const handleConfirmDelete = async (archiveId: string) => {
    setDeletingId(archiveId);
    setActionError(null);
    try {
      await deleteScheduleArchive(archiveId);
      setConfirmDeleteId(null);
      if (previewArchive?.archiveId === archiveId) {
        setPreviewArchive(null);
      }
      onArchiveDeleted?.(archiveId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'تعذر حذف الجدول من الأرشيف. يرجى المحاولة مجدداً.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreClick = (archive: ScheduleArchive) => {
    if (hasActiveTrips && confirmRestoreId !== archive.archiveId) {
      setConfirmRestoreId(archive.archiveId);
      return;
    }
    setConfirmRestoreId(null);
    onRestoreArchive(archive);
  };

  return (
    <div className="space-y-4">
      {/* Search & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F7FBFE] dark:bg-slate-800/70 p-3.5 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#483878] text-white flex items-center justify-center shadow-sm">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#483878] dark:text-slate-100">أرشيف جداول الرحلات المحفوظة</h3>
            <p className="text-xs text-[#444444] dark:text-slate-300 font-medium">
              جداول الرحلات المؤرشفة محفوظة سحابياً ويمكن استعراضها أو تصديرها أو استعادتها في أي وقت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#4A9FD8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالعنوان، التاريخ، أو المنشئ..."
              className="w-full bg-white dark:bg-slate-900 text-xs text-[#444444] dark:text-slate-100 pr-8 pl-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#A9DDF5] dark:border-slate-700 font-mono text-xs font-black text-[#483878] dark:text-slate-100 shrink-0">
            {filteredArchives.length} جدول
          </span>
        </div>
      </div>

      {/* Errors */}
      {(error || actionError) && (
        <div className="p-3.5 rounded-xl bg-[#D92D20]/10 border border-[#D92D20]/35 flex items-center gap-2 text-xs font-bold text-[#D92D20]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-12 text-center bg-[#F7FBFE] dark:bg-slate-800/60 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <div className="w-8 h-8 rounded-xl bg-[#483878]/15 dark:bg-[#483878]/40 border border-[#483878]/30 mx-auto mb-2.5 animate-pulse" />
          <p className="text-xs font-bold text-[#483878] dark:text-slate-100">جارٍ تحميل جداول الأرشيف...</p>
        </div>
      ) : filteredArchives.length === 0 ? (
        <div className="py-12 px-4 text-center bg-[#F7FBFE] dark:bg-slate-800/60 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <Archive className="w-9 h-9 text-[#4A9FD8] mx-auto mb-2.5" />
          <p className="text-sm font-black text-[#483878] dark:text-slate-100">
            {archives.length === 0
              ? 'الأرشيف فارغ حالياً'
              : 'لا توجد نتائج مطابقة لبحثك في الأرشيف'}
          </p>
          <p className="text-xs text-[#444444] dark:text-slate-300 mt-1">
            {archives.length === 0
              ? 'بعد استيراد جدول رحلات، اضغط على زر «حفظ في الأرشيف» أعلى الجدول لحفظ نسخة دائمة هنا'
              : 'جرّب البحث بعنوان أو تاريخ مختلف'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredArchives.map((archive) => {
            const isAutoArchived =
              archive.archiveId.startsWith('auto_') || archive.archiveId.startsWith('local_auto_');
            const canDelete =
              archive.archiveId.startsWith('local_auto_') ||
              currentUser?.role === 'general_manager' ||
              (currentUser?.uid && archive.createdBy === currentUser.uid);
            const isDeleting = deletingId === archive.archiveId;
            const isConfirmingDelete = confirmDeleteId === archive.archiveId;
            const isConfirmingRestore = confirmRestoreId === archive.archiveId;

            return (
              <div
                key={archive.archiveId}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8] shadow-sm transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#A9DDF5]/50 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-[#483878] dark:text-slate-100 truncate" title={archive.title}>
                          {archive.title}
                        </h4>
                        {isAutoArchived && (
                          <span className="px-2 py-0.5 rounded-md bg-[#22A06B]/10 border border-[#22A06B]/30 text-xs font-bold text-[#22A06B] shrink-0">
                            أرشفة تلقائية
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#444444] dark:text-slate-300 font-semibold">
                        <span className="flex items-center gap-1 font-mono text-[#483878] dark:text-[#A9DDF5]">
                          <Calendar className="w-3.5 h-3.5 text-[#4A9FD8]" />
                          <span>{archive.scheduleDate}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#E8742A]" />
                          <span>{archive.createdByName}</span>
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-[#F7FBFE] dark:bg-slate-900 border border-[#A9DDF5] dark:border-slate-700 text-xs font-mono font-bold text-[#444444] dark:text-slate-300 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#4A9FD8]" />
                      <span>{formatUnifiedDateTime(archive.createdAt)}</span>
                    </span>
                  </div>

                  {/* Stats Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/20 dark:border-[#A9DDF5]/25 text-xs font-bold text-[#483878] dark:text-[#A9DDF5] font-mono">
                      {archive.totalTrips} رحلة
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#A9DDF5]/25 dark:bg-slate-900 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold text-[#483878] dark:text-slate-200 font-mono flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5 text-[#4A9FD8]" />
                      <span>{archive.totalBuses} حافلة</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#22A06B]/10 border border-[#22A06B]/30 text-xs font-bold text-[#22A06B] font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{archive.completedTrips} منتهية</span>
                    </span>
                  </div>

                  {/* Notes */}
                  {archive.notes && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-900/70 border border-[#A9DDF5]/70 dark:border-slate-700 text-xs text-[#444444] dark:text-slate-300 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#4A9FD8] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{archive.notes}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#A9DDF5]/40 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewArchive(archive)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-900 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#4A9FD8]" />
                      <span>عرض الجدول</span>
                    </button>

                    {isConfirmingRestore ? (
                      <div className="flex items-center gap-1.5 bg-[#F5B13D]/15 border border-[#F5B13D]/50 px-2.5 py-1 rounded-xl">
                        <span className="text-xs font-bold text-[#483878] dark:text-slate-100">استبدال الجدول الحالي؟</span>
                        <button
                          type="button"
                          onClick={() => handleRestoreClick(archive)}
                          className="px-2 py-0.5 rounded-lg bg-[#E8742A] text-white text-xs font-black cursor-pointer"
                        >
                          نعم
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(null)}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-[#444444] dark:text-slate-200 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestoreClick(archive)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] text-white text-xs font-black shadow-sm transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تحميل للجدول الحالي</span>
                      </button>
                    )}
                  </div>

                  {canDelete && (
                    <div>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleConfirmDelete(archive.archiveId)}
                            className="px-2.5 py-1 rounded-lg bg-[#D92D20] text-white text-xs font-black cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#A9DDF5] dark:border-slate-700 text-[#444444] dark:text-slate-200 text-xs font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(archive.archiveId)}
                          className="p-1.5 rounded-lg text-[#444444] dark:text-slate-300 hover:text-[#D92D20] hover:bg-[#D92D20]/10 border border-transparent hover:border-[#D92D20]/30 transition-colors cursor-pointer"
                          title="حذف من الأرشيف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archive Trips Preview Modal */}
      {previewArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#483878]/45 backdrop-blur-xs">
          <div className="w-full max-w-5xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#444444] dark:text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#483878] text-white flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#483878] dark:text-slate-100">{previewArchive.title}</h3>
                  <p className="text-xs text-[#444444] dark:text-slate-300 font-semibold">
                    تاريخ التشغيل: <span className="font-mono text-[#483878] dark:text-[#A9DDF5]">{previewArchive.scheduleDate}</span> ·{' '}
                    حفظ بواسطة: <span className="text-[#483878] dark:text-[#A9DDF5]">{previewArchive.createdByName}</span> ·{' '}
                    <span className="font-mono">{previewArchive.trips.length} رحلة</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ReportExportButtons
                  trips={previewArchive.trips as Trip[]}
                  currentTime={currentTime}
                  compact
                  filterLabel={`أرشيف: ${previewArchive.title}`}
                />
                <button
                  type="button"
                  onClick={() => setPreviewArchive(null)}
                  className="p-2 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#EEF7FC] dark:hover:bg-slate-700 border border-[#A9DDF5] dark:border-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto flex-1">
              <div className="border border-[#A9DDF5] dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#483878] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3">رقم الرحلة</th>
                      <th className="py-2.5 px-3">الحافلة</th>
                      <th className="py-2.5 px-3">السائق</th>
                      <th className="py-2.5 px-3">الانطلاق</th>
                      <th className="py-2.5 px-3">الوجهة</th>
                      <th className="py-2.5 px-3 text-center">المواعيد</th>
                      <th className="py-2.5 px-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#A9DDF5]/40 dark:divide-slate-700/70">
                    {previewArchive.trips.map((t, idx) => {
                      const meta = getStatusMeta(t.status || 'completed_scheduled');
                      return (
                        <tr key={t.id || idx} className="hover:bg-[#F7FBFE] dark:hover:bg-slate-800/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#483878] dark:text-slate-100">
                            {t.tripNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#4A9FD8] dark:text-[#A9DDF5]">
                            {t.busId}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#444444] dark:text-slate-200" title={t.driverName}>
                            {formatShortDriverName(t.driverName)}
                          </td>
                          <td className="py-2.5 px-3 text-[#444444] dark:text-slate-300">{t.origin}</td>
                          <td className="py-2.5 px-3 text-[#444444] dark:text-slate-300">{t.destination}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#483878] dark:text-slate-100">
                            {t.departureTime} ← {t.arrivalTime}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex flex-wrap items-center justify-center gap-1">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                              >
                                {meta.label}
                              </span>
                              {t.isElapsedAtImport && (
                                <span
                                  title="حُسبت من الجدول المستورد"
                                  className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#22A06B]/10 text-[#22A06B] dark:text-emerald-300 border border-[#22A06B]/30 cursor-help"
                                >
                                  منجزة تلقائياً
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-800/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onRestoreArchive(previewArchive);
                  setPreviewArchive(null);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] text-white text-xs font-black shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تحميل هذا الجدول إلى اللوحة</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewArchive(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-slate-100 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
