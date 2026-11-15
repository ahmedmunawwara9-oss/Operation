import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Trip } from '../types';
import { ScheduleKPIs } from '../services/scheduleEngine';
import { exportTripsToExcel, exportTripsToPDF } from '../services/reportExporter';

interface ReportExportButtonsProps {
  trips: Trip[];
  kpis?: ScheduleKPIs;
  companyName?: string;
  exportedBy?: string;
  filterLabel?: string;
  currentTime?: Date;
  compact?: boolean;
}

export const ReportExportButtons: React.FC<ReportExportButtonsProps> = ({
  trips,
  kpis,
  companyName,
  exportedBy,
  filterLabel,
  currentTime,
  compact = false,
}) => {
  const [exportingType, setExportingType] = useState<'excel' | 'pdf' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const handleExportExcel = () => {
    if (trips.length === 0) {
      showFeedback('error', 'لا توجد رحلات حالية للتصدير');
      return;
    }

    try {
      setExportingType('excel');
      exportTripsToExcel(trips, {
        kpis,
        companyName,
        exportedBy,
        filterLabel,
        currentTime,
      });
      showFeedback('success', 'تم تصدير ملف Excel بنجاح');
    } catch (err) {
      showFeedback(
        'error',
        err instanceof Error ? err.message : 'تعذر تصدير ملف Excel'
      );
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPDF = async () => {
    if (trips.length === 0) {
      showFeedback('error', 'لا توجد رحلات حالية للتصدير');
      return;
    }

    try {
      setExportingType('pdf');
      await exportTripsToPDF(trips, {
        kpis,
        companyName,
        exportedBy,
        filterLabel,
        currentTime,
      });
      showFeedback('success', 'تم تصدير تقرير PDF بنجاح');
    } catch (err) {
      showFeedback(
        'error',
        err instanceof Error ? err.message : 'تعذر إنشاء تقرير PDF'
      );
    } finally {
      setExportingType(null);
    }
  };

  const isDisabled = exportingType !== null || trips.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statusMessage && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            statusMessage.type === 'success'
              ? 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/30'
              : 'bg-[#D92D20]/10 text-[#D92D20] border-[#D92D20]/30'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#22A06B]" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#D92D20]" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Export Excel (.xlsx) */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleExportExcel}
        title={
          trips.length === 0
            ? 'استورد جدول رحلات أولاً لتفعيل التصدير'
            : 'تصدير قائمة الرحلات الحالية كملف Excel (.xlsx)'
        }
        className={`flex items-center gap-1.5 rounded-xl font-bold border transition-all cursor-pointer active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed shadow-sm ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        } bg-white dark:bg-slate-800 hover:bg-[#A9DDF5]/25 dark:hover:bg-slate-700 text-[#483878] dark:text-slate-100 border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]`}
      >
        {exportingType === 'excel' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-[#4A9FD8]" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-[#4A9FD8]" />
        )}
        <span>تصدير Excel</span>
      </button>

      {/* Export PDF (.pdf) */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleExportPDF}
        title={
          trips.length === 0
            ? 'استورد جدول رحلات أولاً لتفعيل التصدير'
            : 'تصدير قائمة الرحلات الحالية كملف PDF منسق للمشاركة'
        }
        className={`flex items-center gap-1.5 rounded-xl font-bold border transition-all cursor-pointer active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed shadow-xs ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        } bg-[#E8742A] hover:bg-[#d6661f] text-white border-[#E8742A] shadow-[#E8742A]/20`}
      >
        {exportingType === 'pdf' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{exportingType === 'pdf' ? 'جارٍ إعداد PDF...' : 'تصدير PDF'}</span>
      </button>
    </div>
  );
};
