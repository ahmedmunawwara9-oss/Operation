import React, { useState } from 'react';
import {
  Settings,
  X,
  Check,
  RotateCcw,
  Download,
  Trash2,
  Sparkles,
  Sliders,
  Clock,
  Tv,
} from 'lucide-react';
import { AppSettings, Trip } from '../types';
import { exportTripsToCSV } from '../services/storageService';
import { ReportExportButtons } from './ReportExportButtons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onResetToDefaults: () => void;
  onLoadDemoData: () => void;
  onClearAllData: () => void;
  trips: Trip[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToDefaults,
  onLoadDemoData,
  onClearAllData,
  trips,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#483878]/45 dark:bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 rounded-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden text-[#444444] dark:text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#483878] dark:text-white">إعدادات لوحة العمليات والتحكم</h2>
              <p className="text-xs text-[#444444] dark:text-slate-300 font-medium">تخصيص الهوية، المنطقة الزمنية، وشاشات العرض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Section 1: Branding */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#483878] dark:text-slate-100 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#E8742A]" />
              <span>هوية الشركة ولوحة العمليات</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[#444444] dark:text-slate-300 mb-1 font-semibold">اسم المنشأة / الشركة</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-white font-bold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#444444] dark:text-slate-300 mb-1 font-semibold">عنوان لوحة المراقبة</label>
                <input
                  type="text"
                  value={form.dashboardTitle}
                  onChange={(e) => setForm({ ...form, dashboardTitle: e.target.value })}
                  className="w-full bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-white font-bold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-[#A9DDF5]/50 dark:bg-slate-700/70" />

          {/* Section 2: Timezone & Operations */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#483878] dark:text-slate-100 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4A9FD8]" />
              <span>المنطقة الزمنية والتشغيل</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[#444444] dark:text-slate-300 mb-1 font-semibold">المنطقة الزمنية المعتمدة</label>
                <select
                  value={form.timeZone}
                  onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
                  className="w-full bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-white font-semibold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none"
                >
                  <option value="Asia/Riyadh">توقيت مكة والمدينة المنورة (GMT+3)</option>
                  <option value="Asia/Dubai">توقيت الخليج / دبي (GMT+4)</option>
                  <option value="Africa/Cairo">توقيت القاهرة (GMT+2)</option>
                  <option value="UTC">توقيت غرينتش العالمي (UTC)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#444444] dark:text-slate-300 mb-1 font-semibold">
                  فترة التنبيه المسبق قبل المغادرة (دقائق)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.departureWarningMinutes}
                  onChange={(e) =>
                    setForm({ ...form, departureWarningMinutes: parseInt(e.target.value, 10) || 30 })
                  }
                  className="w-full bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-white font-bold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="overnight"
                checked={form.overnightInference}
                onChange={(e) => setForm({ ...form, overnightInference: e.target.checked })}
                className="rounded accent-[#E8742A] cursor-pointer"
              />
              <label htmlFor="overnight" className="text-[#444444] dark:text-slate-300 font-semibold cursor-pointer select-none">
                معالجة الرحلات الليلية تلقائياً (إضافة يوم لتاريخ الوصول إذا كان وقت الوصول أقل من الانطلاق)
              </label>
            </div>
          </div>

          <div className="w-full h-px bg-[#A9DDF5]/50 dark:bg-slate-700/70" />

          {/* Section 3: TV Display */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#483878] dark:text-slate-100 text-sm flex items-center gap-2">
              <Tv className="w-4 h-4 text-[#F5B13D]" />
              <span>إعدادات وضع شاشات العرض TV</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[#444444] dark:text-slate-300 mb-1 font-semibold">
                  فترة التدوير التلقائي للشاشات (ثوانٍ)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.tvRotationInterval}
                  onChange={(e) =>
                    setForm({ ...form, tvRotationInterval: parseInt(e.target.value, 10) || 20 })
                  }
                  className="w-full bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-white font-bold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#444444] dark:text-slate-300 mb-1 font-semibold">
                  الحد الأقصى للحافلات المعروضة في الصفحة الواحدة
                </label>
                <input
                  type="number"
                  min="4"
                  max="20"
                  value={form.activeBusLimit}
                  onChange={(e) =>
                    setForm({ ...form, activeBusLimit: parseInt(e.target.value, 10) || 8 })
                  }
                  className="w-full bg-[#F7FBFE] dark:bg-slate-800 text-[#483878] dark:text-white font-bold px-3 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-[#A9DDF5]/50 dark:bg-slate-700/70" />

          {/* Section 4: Data Management */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#483878] dark:text-slate-100 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-[#4A9FD8]" />
              <span>إدارة وتصدير البيانات الحالية</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <ReportExportButtons trips={trips} companyName={form.companyName} />

              <button
                type="button"
                onClick={() => exportTripsToCSV(trips)}
                disabled={trips.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 border border-[#A9DDF5] dark:border-slate-700 disabled:opacity-45 text-[#483878] dark:text-slate-100 font-bold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#4A9FD8]" />
                <span>تصدير CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onLoadDemoData();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5B13D]/15 hover:bg-[#F5B13D]/25 text-[#483878] dark:text-amber-300 border border-[#F5B13D]/50 font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#E8742A]" />
                <span>تحميل البيانات التجريبية لدرة المنورة</span>
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D92D20]/10 dark:bg-[#D92D20]/20 hover:bg-[#D92D20]/15 text-[#D92D20] dark:text-red-400 border border-[#D92D20]/35 font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>مسح البيانات الحالية</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-[#D92D20]/10 dark:bg-[#D92D20]/20 border border-[#D92D20]/40 px-2.5 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-[#D92D20] dark:text-red-400">تأكيد المسح؟</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      setConfirmClear(false);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#D92D20] text-white text-xs font-black cursor-pointer"
                  >
                    نعم، امسح
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#444444] dark:text-slate-200 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onResetToDefaults}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضيات</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#E8742A] hover:bg-[#d5651e] text-white transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
