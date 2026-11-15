import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  readExcelFile,
  extractSheetData,
  autoDetectColumnMapping,
  validateAndParseRows,
  mergeTrips,
  MergeTripsMode,
  MergeTripsResult,
} from '../services/excelParser';
import { getTodayDateString } from '../services/dateTimeUtils';
import { ColumnMapping, ImportedRowPreview, Trip } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (
    trips: Trip[],
    mappingUsed: ColumnMapping,
    mode?: MergeTripsMode
  ) => MergeTripsResult | void;
  existingTrips?: Trip[];
  onLoadDemoData?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  existingTrips = [],
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    tripNumber: '',
    busId: '',
    driverName: '',
    origin: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    tripDate: '',
    route: '',
    passengerCount: '',
    plateNumber: '',
    notes: '',
  });
  const [previews, setPreviews] = useState<ImportedRowPreview[]>([]);
  const [operationDate, setOperationDate] = useState<string>(() => getTodayDateString());
  const [afterMidnightNextDay, setAfterMidnightNextDay] = useState<boolean>(true);
  const [mergeMode, setMergeMode] = useState<MergeTripsMode>('skip');
  const [importSummary, setImportSummary] = useState<Pick<
    MergeTripsResult,
    'added' | 'skipped' | 'updated' | 'duplicatesInFile'
  > | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingTrips = existingTrips.length > 0;

  const previewValidTrips = useMemo(() => {
    return previews
      .filter((p) => !p.isExcluded && p.isValid && p.parsed)
      .map((p) => p.parsed as Trip);
  }, [previews]);

  const dryRunMerge = useMemo(() => {
    if (!hasExistingTrips || previewValidTrips.length === 0) return null;
    return mergeTrips(existingTrips, previewValidTrips, mergeMode);
  }, [hasExistingTrips, existingTrips, previewValidTrips, mergeMode]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('upload');
    setFileName('');
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setHeaders([]);
    setRawRows([]);
    setPreviews([]);
    setMergeMode('skip');
    setImportSummary(null);
    setErrorMsg(null);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setFileName(file.name);

      const info = await readExcelFile(file);
      setWorkbook(info.workbook);
      setSheetNames(info.sheetNames);

      const firstSheet = info.sheetNames[0] || '';
      setSelectedSheet(firstSheet);

      const { headers: extractedHeaders, rawRows: extractedRows } = extractSheetData(
        info.workbook,
        firstSheet
      );

      if (extractedHeaders.length === 0 || extractedRows.length === 0) {
        setErrorMsg('لم يتم العثور على بيانات صالحة في ورقة العمل المحددة.');
        setIsProcessing(false);
        return;
      }

      setHeaders(extractedHeaders);
      setRawRows(extractedRows);

      const detectedMapping = autoDetectColumnMapping(extractedHeaders);
      setMapping(detectedMapping);

      setStep('mapping');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`حدث خطأ أثناء قراءة الملف: ${err.message || 'تأكد من صيغة الملف'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    setSelectedSheet(sheetName);
    const { headers: extractedHeaders, rawRows: extractedRows } = extractSheetData(
      workbook,
      sheetName
    );
    setHeaders(extractedHeaders);
    setRawRows(extractedRows);
    const detected = autoDetectColumnMapping(extractedHeaders);
    setMapping(detected);
  };

  const handleProceedToPreview = () => {
    if (!mapping.departureTime || !mapping.arrivalTime) {
      setErrorMsg('يجب تعيين عمود وقت الانطلاق ووقت الوصول على الأقل للمتابعة.');
      return;
    }
    setErrorMsg(null);

    const parsed = validateAndParseRows(
      rawRows,
      mapping,
      operationDate || getTodayDateString(),
      afterMidnightNextDay
    );
    setPreviews(parsed);
    setStep('preview');
  };

  const handleUpdatePreviewDateSettings = (nextDate: string, nextAfterMidnight: boolean) => {
    setOperationDate(nextDate);
    setAfterMidnightNextDay(nextAfterMidnight);
    if (step === 'preview' && rawRows.length > 0) {
      const reparsed = validateAndParseRows(
        rawRows,
        mapping,
        nextDate || getTodayDateString(),
        nextAfterMidnight
      );
      setPreviews((prev) => {
        const excludedSet = new Set(prev.filter((r) => r.isExcluded).map((r) => r.rowIndex));
        return reparsed.map((r) => ({
          ...r,
          isExcluded: prev.length > 0 ? excludedSet.has(r.rowIndex) : r.isExcluded,
        }));
      });
    }
  };

  const handleToggleRowExclusion = (rowIndex: number) => {
    setPreviews((prev) =>
      prev.map((row) => (row.rowIndex === rowIndex ? { ...row, isExcluded: !row.isExcluded } : row))
    );
  };

  const handleFinalImport = () => {
    const confirmNowMs = Date.now();
    const validTrips = previews
      .filter((p) => !p.isExcluded && p.isValid && p.parsed)
      .map((p) => {
        const t = p.parsed as Trip;
        const arrMs = new Date(t.arrivalDateTime).getTime();
        const isElapsed =
          !isNaN(arrMs) &&
          arrMs <= confirmNowMs &&
          t.actualStatus !== 'delayed' &&
          t.actualStatus !== 'cancelled' &&
          !(t.delayMinutes && t.delayMinutes > 0);
        return isElapsed ? { ...t, isElapsedAtImport: true } : t;
      });

    if (validTrips.length === 0) {
      setErrorMsg('لا توجد سجلات صالحة للاستيراد بعد الاستبعاد.');
      return;
    }

    if (!hasExistingTrips) {
      onConfirmImport(validTrips, mapping, 'skip');
      handleClose();
      return;
    }

    const summary = onConfirmImport(validTrips, mapping, mergeMode);
    if (summary) {
      setImportSummary({
        added: summary.added,
        skipped: summary.skipped,
        updated: summary.updated,
        duplicatesInFile: summary.duplicatesInFile,
      });
    } else {
      handleClose();
    }
  };

  const validCount = previews.filter((p) => !p.isExcluded && p.isValid).length;
  const invalidCount = previews.filter((p) => !p.isValid).length;
  const elapsedCount = previews.filter(
    (p) => !p.isExcluded && p.isValid && p.parsed?.isElapsedAtImport
  ).length;
  const dateWarningCount = previews.filter((p) =>
    p.warnings.includes('تعذّر قراءة تاريخ هذا الصف، تم استخدام تاريخ التشغيل')
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#483878]/45 dark:bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-4xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 rounded-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden text-[#444444] dark:text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#483878] dark:text-white">
                استيراد جدول الرحلات من ملف Excel / CSV
              </h2>
              <p className="text-xs text-[#444444] dark:text-slate-300 font-medium">
                معالجة ذكية ومطابقة تلقائية لأسطول درة المنورة للنقليات
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-6 py-3 bg-white dark:bg-[#131C31] border-b border-[#A9DDF5]/60 dark:border-slate-700 text-xs font-bold">
          <div
            className={`flex items-center gap-1.5 ${
              step === 'upload' ? 'text-[#E8742A]' : 'text-[#22A06B] dark:text-emerald-400'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#F7FBFE] dark:bg-slate-800 flex items-center justify-center font-mono text-xs border border-current">
              1
            </span>
            <span>اختيار الملف</span>
          </div>
          <span className="text-[#A9DDF5] dark:text-slate-600">←</span>
          <div
            className={`flex items-center gap-1.5 ${
              step === 'mapping'
                ? 'text-[#E8742A]'
                : step === 'preview'
                ? 'text-[#22A06B] dark:text-emerald-400'
                : 'text-[#444444] dark:text-slate-400'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#F7FBFE] dark:bg-slate-800 flex items-center justify-center font-mono text-xs border border-current">
              2
            </span>
            <span>مطابقة الأعمدة</span>
          </div>
          <span className="text-[#A9DDF5] dark:text-slate-600">←</span>
          <div
            className={`flex items-center gap-1.5 ${
              step === 'preview' ? 'text-[#E8742A]' : 'text-[#444444] dark:text-slate-400'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#F7FBFE] dark:bg-slate-800 flex items-center justify-center font-mono text-xs border border-current">
              3
            </span>
            <span>المعاينة والاعتماد</span>
          </div>
        </div>

        {/* Errors */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-[#D92D20]/10 dark:bg-[#D92D20]/15 border border-[#D92D20]/35 flex items-center gap-2 text-xs font-semibold text-[#D92D20] dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#D92D20] dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {importSummary ? (
            <div className="py-10 px-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#22A06B]/15 dark:bg-emerald-950/60 text-[#22A06B] dark:text-emerald-400 flex items-center justify-center mx-auto border border-[#22A06B]/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-black text-[#483878] dark:text-white">
                تم استيراد ودمج جدول الرحلات بنجاح
              </h3>
              <p className="text-sm font-bold text-[#22A06B] dark:text-emerald-400 bg-[#22A06B]/10 dark:bg-emerald-950/40 border border-[#22A06B]/30 rounded-2xl py-3 px-5 inline-block">
                تمت إضافة {importSummary.added} رحلة، وتخطي {importSummary.skipped} مكررة، وتحديث {importSummary.updated}
              </p>
              {importSummary.duplicatesInFile > 0 && (
                <p className="text-xs text-[#444444] dark:text-slate-300 font-semibold">
                  كما تم تجاهل {importSummary.duplicatesInFile} رحلة مكررة داخل نفس الملف والاحتفاظ بأول سجل لها.
                </p>
              )}
            </div>
          ) : (
            <>
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-[#4A9FD8]/60 dark:border-slate-600 hover:border-[#E8742A] rounded-2xl p-10 text-center bg-[#F7FBFE] dark:bg-slate-800/60 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-[#A9DDF5]/40 dark:bg-slate-700/70 text-[#483878] dark:text-[#A9DDF5] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="text-base font-black text-[#483878] dark:text-white mb-1">
                  اسحب وأفلت ملف إكسل هنا أو انقر لتصفح الجهاز
                </h3>
                <p className="text-xs text-[#444444] dark:text-slate-300 mb-4 font-medium">
                  يدعم صيغ .xlsx و .xls و .csv مع كشف فوري لأسماء الأعمدة باللغة العربية والإنجليزية
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#131C31] text-xs font-bold text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-700 shadow-sm">
                  <FileText className="w-4 h-4 text-[#E8742A]" />
                  <span>تحديد ملف جدول الرحلات</span>
                </div>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700">
                  <Layers className="w-4 h-4 text-[#4A9FD8]" />
                  <span className="text-xs font-bold text-[#483878] dark:text-slate-100">ورقة العمل (Sheet):</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="bg-white dark:bg-[#131C31] text-xs font-bold text-[#483878] dark:text-slate-100 px-3 py-1.5 rounded-lg border border-[#A9DDF5] dark:border-slate-700 outline-none"
                  >
                    {sheetNames.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#444444] dark:text-slate-300 font-semibold">
                <p>الملف: <strong className="text-[#483878] dark:text-white">{fileName}</strong> ({rawRows.length} صف)</p>
                <p>تأكد من مطابقة حقول الرحلات الأساسية</p>
              </div>

              {/* Operation Date & After-Midnight Rule */}
              <div className="p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#4A9FD8] shrink-0" />
                  <label htmlFor="excel-operation-date" className="text-xs font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                    تاريخ التشغيل:
                  </label>
                  <input
                    id="excel-operation-date"
                    type="date"
                    value={operationDate}
                    onChange={(e) => setOperationDate(e.target.value)}
                    className="bg-white dark:bg-[#131C31] text-xs font-bold font-mono text-[#483878] dark:text-slate-100 px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700 outline-none focus:border-[#4A9FD8]"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#444444] dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={afterMidnightNextDay}
                    onChange={(e) => setAfterMidnightNextDay(e.target.checked)}
                    className="rounded accent-[#E8742A] cursor-pointer"
                  />
                  <span>الرحلات بعد منتصف الليل (حتى الساعة 06:00) تتبع اليوم التالي</span>
                </label>
              </div>

              {/* Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'tripNumber', label: 'رقم الرحلة *', required: true },
                  { key: 'busId', label: 'رقم الحافلة *', required: true },
                  { key: 'driverName', label: 'اسم السائق *', required: true },
                  { key: 'origin', label: 'نقطة الانطلاق *', required: true },
                  { key: 'destination', label: 'الوجهة *', required: true },
                  { key: 'departureTime', label: 'وقت الانطلاق *', required: true },
                  { key: 'arrivalTime', label: 'وقت الوصول *', required: true },
                  { key: 'tripDate', label: 'تاريخ الرحلة', required: false },
                  { key: 'route', label: 'المسار / الخط', required: false },
                  { key: 'passengerCount', label: 'عدد الركاب', required: false },
                  { key: 'plateNumber', label: 'رقم اللوحة', required: false },
                  { key: 'notes', label: 'ملاحظات', required: false },
                ].map((field) => (
                  <div
                    key={field.key}
                    className="p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#483878] dark:text-slate-100 block">{field.label}</span>
                      <span className="text-xs text-[#444444] dark:text-slate-400">
                        {field.required ? 'حقل رئيسي' : 'حقل اختياري'}
                      </span>
                    </div>

                    <select
                      value={mapping[field.key as keyof ColumnMapping] || ''}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field.key]: e.target.value })
                      }
                      className={`text-xs text-[#483878] dark:text-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border outline-none bg-white dark:bg-[#131C31] max-w-[180px] ${
                        field.required && !mapping[field.key as keyof ColumnMapping]
                          ? 'border-[#E5A100]'
                          : 'border-[#A9DDF5] dark:border-slate-700'
                      }`}
                    >
                      <option value="">-- غير محدد --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Operation Date & After-Midnight Controls in Preview */}
              <div className="p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#4A9FD8] shrink-0" />
                  <label htmlFor="excel-preview-operation-date" className="text-xs font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                    تاريخ التشغيل:
                  </label>
                  <input
                    id="excel-preview-operation-date"
                    type="date"
                    value={operationDate}
                    onChange={(e) => handleUpdatePreviewDateSettings(e.target.value, afterMidnightNextDay)}
                    className="bg-white dark:bg-[#131C31] text-xs font-bold font-mono text-[#483878] dark:text-slate-100 px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700 outline-none focus:border-[#4A9FD8]"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#444444] dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={afterMidnightNextDay}
                    onChange={(e) => handleUpdatePreviewDateSettings(operationDate, e.target.checked)}
                    className="rounded accent-[#E8742A] cursor-pointer"
                  />
                  <span>الرحلات بعد منتصف الليل (حتى الساعة 06:00) تتبع اليوم التالي</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[#22A06B] dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#22A06B] dark:text-emerald-400" />
                    <span>{validCount} رحلة جاهزة للاستيراد</span>
                  </div>
                  {elapsedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[#483878] dark:text-emerald-300 bg-[#22A06B]/10 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-[#22A06B]/30 font-bold">
                      <span>{elapsedCount} رحلة منقضية الموعد (تُحسب منتهية)</span>
                    </div>
                  )}
                  {dateWarningCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[#9A6B00] dark:text-amber-400 font-bold">
                      <AlertTriangle className="w-4 h-4 text-[#E5A100]" />
                      <span>{dateWarningCount} صف بتحذير قراءة التاريخ</span>
                    </div>
                  )}
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[#9A6B00] dark:text-amber-400 font-bold">
                      <AlertTriangle className="w-4 h-4 text-[#E5A100]" />
                      <span>{invalidCount} صف يحتاج مراجعة</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#444444] dark:text-slate-300">
                  يمكنك استبعاد أي صف بإلغاء التحديد أمامه
                </p>
              </div>

              {/* Merge Summary & Mode Options (shown only when existing trips exist) */}
              {hasExistingTrips && dryRunMerge && (
                <div className="p-3.5 rounded-2xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[#483878] dark:text-[#A9DDF5]">
                      سيتم إضافة {dryRunMerge.added} رحلة جديدة، و{dryRunMerge.skipped + dryRunMerge.updated} رحلة مكررة موجودة مسبقًا
                    </p>
                    {dryRunMerge.duplicatesInFile > 0 && (
                      <span className="text-xs font-semibold text-[#9A6B00] dark:text-amber-400">
                        ({dryRunMerge.duplicatesInFile} مكررة داخل الملف)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 font-semibold text-[#444444] dark:text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="excel-merge-mode"
                        value="skip"
                        checked={mergeMode === 'skip'}
                        onChange={() => setMergeMode('skip')}
                        className="accent-[#E8742A] cursor-pointer"
                      />
                      <span>إضافة الجديد فقط وتخطي المكرر</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-[#444444] dark:text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="excel-merge-mode"
                        value="update"
                        checked={mergeMode === 'update'}
                        onChange={() => setMergeMode('update')}
                        className="accent-[#E8742A] cursor-pointer"
                      />
                      <span>إضافة الجديد وتحديث المكرر (مع الحفاظ على حالة التشغيل الفعلية)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="border border-[#A9DDF5] dark:border-slate-700 rounded-2xl overflow-x-auto max-h-[360px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#EEF7FC] dark:bg-slate-800 sticky top-0 z-10 text-[#483878] dark:text-slate-100 font-bold border-b border-[#A9DDF5] dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 text-center">تضمين</th>
                      <th className="py-2.5 px-3">رقم الصف</th>
                      <th className="py-2.5 px-3">رقم الرحلة</th>
                      <th className="py-2.5 px-3">الحافلة</th>
                      <th className="py-2.5 px-3">السائق</th>
                      <th className="py-2.5 px-3">المحطات</th>
                      <th className="py-2.5 px-3 text-center">التاريخ المحسوب</th>
                      <th className="py-2.5 px-3 text-center">المواعيد</th>
                      <th className="py-2.5 px-3">التحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#A9DDF5]/40 dark:divide-slate-700/70">
                    {previews.map((row) => {
                      const dateWarning = row.warnings.find((w) =>
                        w.includes('تعذّر قراءة تاريخ هذا الصف')
                      );
                      return (
                        <tr
                          key={row.rowIndex}
                          className={`transition-colors ${
                            row.isExcluded
                              ? 'opacity-40 bg-slate-50 dark:bg-slate-800/40'
                              : !row.isValid
                              ? 'bg-[#D92D20]/[0.06] dark:bg-[#D92D20]/15'
                              : dateWarning
                              ? 'bg-[#E5A100]/[0.07] dark:bg-[#E5A100]/10'
                              : 'hover:bg-[#F7FBFE] dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={!row.isExcluded}
                              onChange={() => handleToggleRowExclusion(row.rowIndex)}
                              className="rounded accent-[#E8742A] cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-[#444444] dark:text-slate-400">{row.rowIndex}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#483878] dark:text-slate-100">
                            {row.parsed?.tripNumber || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#4A9FD8] font-bold">
                            {row.parsed?.busId || '-'}
                          </td>
                          <td className="py-2 px-3 text-[#444444] dark:text-slate-200 font-medium">
                            {row.parsed?.driverName || '-'}
                          </td>
                          <td className="py-2 px-3 text-[#444444] dark:text-slate-300">
                            {row.parsed?.origin || '-'} ← {row.parsed?.destination || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-[#483878] dark:text-[#A9DDF5] whitespace-nowrap">
                            {row.parsed?.tripDate || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                            {row.parsed?.departureTime} - {row.parsed?.arrivalTime}
                          </td>
                          <td className="py-2 px-3">
                            {!row.isValid ? (
                              <span
                                className="text-xs text-[#D92D20] dark:text-red-400 font-bold flex items-center gap-1 truncate max-w-[180px]"
                                title={row.errors.join('، ')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#D92D20] dark:text-red-400" />
                                {row.errors[0]}
                              </span>
                            ) : dateWarning ? (
                              <span
                                className="text-xs text-[#9A6B00] dark:text-amber-400 font-bold flex items-center gap-1"
                                title={row.warnings.join('، ')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#E5A100]" />
                                {dateWarning}
                              </span>
                            ) : (
                              <span className="text-xs text-[#22A06B] dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#22A06B] dark:text-emerald-400" />
                                صالح
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-900/60">
          {importSummary ? (
            <button
              onClick={handleClose}
              className="mr-auto flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#E8742A] hover:bg-[#d5651e] text-white transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          ) : (
            <>
              {step === 'upload' ? (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
              ) : (
                <button
                  onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-[#483878] dark:text-[#A9DDF5] hover:underline cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>الخطوة السابقة</span>
                </button>
              )}

              {step === 'mapping' && (
                <button
                  onClick={handleProceedToPreview}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E8742A] hover:bg-[#d5651e] text-white transition-all shadow-sm cursor-pointer"
                >
                  <span>معاينة البيانات ({rawRows.length} صف)</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step === 'preview' && (
                <button
                  onClick={handleFinalImport}
                  disabled={validCount === 0}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#E8742A] hover:bg-[#d5651e] text-white transition-all shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد استيراد {validCount} رحلة</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
