import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Maximize,
  Minimize,
  LogOut,
  ChevronDown,
  Shield,
  Settings,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { formatArabicDate, formatDigitalClock } from '../services/dateTimeUtils';
import { AppUser } from '../services/firebase';
import { Trip } from '../types';
import { ScheduleKPIs } from '../services/scheduleEngine';
import { exportTripsToExcel, exportTripsToPDF } from '../services/reportExporter';

interface HeaderProps {
  currentTime: Date;
  timeZone?: string;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  isDark?: boolean;
  onToggleDark?: () => void;
  onOpenSettings?: () => void;
  trips?: Trip[];
  kpis?: ScheduleKPIs;
  companyName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTime,
  timeZone = 'Asia/Riyadh',
  currentUser,
  onLogout,
  isDark = false,
  onToggleDark,
  onOpenSettings,
  trips = [],
  kpis,
  companyName,
}) => {
  const { timeStr, secondsStr } = formatDigitalClock(currentTime, timeZone);
  const arabicDateStr = formatArabicDate(currentTime, timeZone);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<'excel' | 'pdf' | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsExportMenuOpen(false);
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  const handleExportExcel = () => {
    if (trips.length === 0) return;
    try {
      setExportingType('excel');
      exportTripsToExcel(trips, {
        kpis,
        companyName,
        exportedBy: currentUser ? `${currentUser.displayName} (${currentUser.roleTitle})` : undefined,
        currentTime,
      });
    } finally {
      setExportingType(null);
      setIsExportMenuOpen(false);
    }
  };

  const handleExportPDF = async () => {
    if (trips.length === 0) return;
    try {
      setExportingType('pdf');
      await exportTripsToPDF(trips, {
        kpis,
        companyName,
        exportedBy: currentUser ? `${currentUser.displayName} (${currentUser.roleTitle})` : undefined,
        currentTime,
      });
    } finally {
      setExportingType(null);
      setIsExportMenuOpen(false);
    }
  };

  return (
    <header className="w-full relative mb-4 select-none z-30">
      <div className="card-white rounded-2xl px-4 sm:px-6 py-3.5 flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 relative">
        {/* Right Section: 48x48 Logo + Brand Name + Operations Lines */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-[#A9DDF5] dark:border-slate-600 flex items-center justify-center shrink-0 shadow-2xs">
            <img
              src={`${import.meta.env.BASE_URL}assets/aistudio/logo_df9a0408.jpeg`}
              alt="شعار درة المنورة لنقل الحجاج والمعتمرين - DMTC"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-[20px] font-bold text-[#483878] dark:text-slate-100 leading-tight truncate">
              درة المنورة
            </h1>
            <p className="text-[13px] font-semibold text-[#444444] dark:text-slate-300 leading-snug truncate">
              مكتب التشغيل والعمليات
            </p>
            <p className="text-[13px] font-medium text-[#444444] dark:text-slate-300 leading-snug truncate">
              مدير التشغيل: <span className="font-bold text-[#483878] dark:text-[#A9DDF5]">الأستاذ عبد الحميد سالمة</span>
            </p>
          </div>
        </div>

        {/* Left Section: Combined Clock/Date Card + Export + More Menu + User Chip */}
        <div className="flex flex-wrap items-center gap-3 justify-end mr-auto">
          {/* Combined Live Status + Clock + Date Card */}
          <div className="flex items-center gap-3 bg-[#F7FBFE] dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-[#A9DDF5] dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#22A06B] dark:text-emerald-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#22A06B] dot-pulse-live shrink-0" aria-hidden="true" />
              <span>مباشر</span>
            </div>

            <div className="h-6 w-px bg-[#A9DDF5] dark:bg-slate-700 shrink-0" aria-hidden="true" />

            <div className="flex items-baseline gap-2.5">
              <div
                dir="ltr"
                className="font-mono tabular-nums text-[20px] font-bold text-[#483878] dark:text-slate-100 leading-none"
              >
                <span>{timeStr}</span>
                <span className="text-[14px] text-[#4A9FD8] font-bold">:{secondsStr}</span>
              </div>
              <span className="hidden sm:inline text-[13px] font-medium text-[#444444] dark:text-slate-300 whitespace-nowrap">
                {arabicDateStr}
              </span>
            </div>
          </div>

          {/* Primary Orange Export Button with PDF & Excel Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              disabled={trips.length === 0 || exportingType !== null}
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              aria-expanded={isExportMenuOpen}
              aria-haspopup="menu"
              title={trips.length === 0 ? 'استورد جدول رحلات أولاً لتفعيل التصدير' : 'تصدير التقارير'}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] disabled:opacity-45 disabled:cursor-not-allowed text-white text-[13px] font-bold shadow-xs transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] whitespace-nowrap"
            >
              {exportingType ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Download className="w-4 h-4 shrink-0" />
              )}
              <span>تصدير</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  isExportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isExportMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-2 w-44 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 shadow-lg p-1.5 z-50"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportPDF}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4A9FD8] shrink-0" />
                    <span>PDF</span>
                  </span>
                  <span className="text-[12px] font-mono text-slate-400">.pdf</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportExcel}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#22A06B] shrink-0" />
                    <span>Excel</span>
                  </span>
                  <span className="text-[12px] font-mono text-slate-400">.xlsx</span>
                </button>
              </div>
            )}
          </div>

          {/* Overflow "⋯" Menu: Dark Mode, Fullscreen, Weather, Settings */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              aria-expanded={isMoreMenuOpen}
              aria-haspopup="menu"
              aria-label="المزيد من الخيارات"
              title="المزيد من الخيارات"
              className="w-10 h-10 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/80 hover:bg-[#A9DDF5]/30 dark:hover:bg-slate-700 border border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-[#A9DDF5] flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {isMoreMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 shadow-lg p-1.5 z-50 space-y-1"
              >
                {onToggleDark && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onToggleDark();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>{isDark ? 'الوضع الفاتح' : 'الوضع الليلي'}</span>
                    {isDark ? <Sun className="w-4 h-4 text-[#F5B13D]" /> : <Moon className="w-4 h-4 text-[#483878] dark:text-[#A9DDF5]" />}
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void toggleFullscreen();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span>{isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}</span>
                  {isFullscreen ? <Minimize className="w-4 h-4 text-[#E8742A]" /> : <Maximize className="w-4 h-4 text-[#4A9FD8]" />}
                </button>

                {/* TODO: Wire live weather API if dynamic weather details are added */}
                <div
                  role="menuitem"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#444444] dark:text-slate-300 bg-[#F7FBFE] dark:bg-slate-800/60"
                >
                  <span>الطقس</span>
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#483878] dark:text-slate-100" dir="ltr">
                    <Sun className="w-4 h-4 text-[#F5B13D]" />
                    26°C
                  </span>
                </div>

                {onOpenSettings && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>الإعدادات</span>
                    <Settings className="w-4 h-4 text-[#4A9FD8]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Chip & Account Menu */}
          {currentUser && (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                className="h-10 flex items-center gap-2 px-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/80 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${
                    currentUser.role === 'general_manager'
                      ? 'bg-gradient-to-br from-[#483878] to-[#E8742A]'
                      : 'bg-gradient-to-br from-[#483878] to-[#4A9FD8]'
                  }`}
                >
                  <span className="font-bold text-[12px]">
                    {currentUser.role === 'general_manager'
                      ? 'GM'
                      : currentUser.displayName.slice(0, 2)}
                  </span>
                </div>
                <span className="text-[13px] font-bold text-[#483878] dark:text-slate-100 max-w-[130px] truncate" title={currentUser.displayName}>
                  {currentUser.displayName}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#483878] dark:text-slate-300 transition-transform duration-150 ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isUserMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 shadow-lg p-2 z-50"
                >
                  <div className="px-3 py-2 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/70 dark:border-slate-700 mb-1.5">
                    <span className="block text-[12px] font-semibold text-[#444444] dark:text-slate-400">
                      الدور الوظيفي
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-[#483878] dark:text-[#A9DDF5] shrink-0" />
                      <span className="text-[13px] font-bold text-[#483878] dark:text-slate-100">
                        {currentUser.roleTitle}
                      </span>
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-bold text-[#D92D20] hover:bg-[#D92D20]/10 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#D92D20]"
                    >
                      <span>تسجيل الخروج</span>
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
