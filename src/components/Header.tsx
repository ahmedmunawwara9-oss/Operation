import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  TrendingUp,
  Sun,
  Moon,
  Maximize,
  Minimize,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { formatArabicDate, formatDigitalClock } from '../services/dateTimeUtils';
import { AppUser } from '../services/firebase';

interface HeaderProps {
  currentTime: Date;
  timeZone?: string;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTime,
  timeZone = 'Asia/Riyadh',
  currentUser,
  onLogout,
  isDark = false,
  onToggleDark,
}) => {
  const { timeStr, secondsStr } = formatDigitalClock(currentTime, timeZone);
  const arabicDateStr = formatArabicDate(currentTime, timeZone);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
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

  return (
    <header className="w-full relative mb-4 select-none z-30">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-3.5 bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md p-3.5 sm:px-6 sm:py-3.5 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 shadow-sm relative">
        {/* Top Brand Color Ribbon clipped cleanly to header radius */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl overflow-hidden pointer-events-none">
          <div className="w-full h-full gradient-brand-ribbon" />
        </div>

        {/* Right Section: DMTC Brand Logo + Operations Office (with Director Subline) */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 z-10 w-full xl:w-auto justify-between xl:justify-start">
          {/* Official Logo Frame + Brand Typography */}
          <div className="flex items-center gap-3">
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white p-1 shadow-sm flex items-center justify-center shrink-0 border border-[#A9DDF5] dark:border-slate-600">
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/logo_df9a0408.jpeg`}
                alt="شعار درة المنورة لنقل الحجاج والمعتمرين - DMTC"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-[#483878] dark:text-slate-100 tracking-tight font-sans">
                  درة المنورة
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#483878] text-white">
                  DMTC
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#E8742A] mt-0.5">
                لنقل الحجاج والمعتمرين
              </span>
            </div>
          </div>

          {/* Subtle Divider */}
          <div className="hidden sm:block h-9 w-px bg-[#A9DDF5] dark:bg-slate-700" />

          {/* Operations Office + Director subline */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#483878] to-[#4A9FD8] flex items-center justify-center text-white shadow-sm shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-right">
              <h1 className="text-sm sm:text-base font-extrabold text-[#483878] dark:text-slate-100 tracking-tight leading-snug">
                مكتب التشغيل والعمليات
              </h1>
              <p className="text-xs text-[#444444] dark:text-slate-300 font-semibold">
                مدير التشغيل: <span className="font-bold text-[#483878] dark:text-[#A9DDF5]">الأستاذ عبد الحميد سالمة</span>
              </p>
            </div>
          </div>

          {/* Logged-in User Account Dropdown */}
          {currentUser && (
            <>
              <div className="hidden lg:block h-9 w-px bg-[#A9DDF5] dark:bg-slate-700" />
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] ${
                    currentUser.role === 'general_manager'
                      ? 'bg-[#F5B13D]/12 dark:bg-[#F5B13D]/15 border-[#F5B13D]/60 dark:border-[#F5B13D]/40 hover:bg-[#F5B13D]/20'
                      : 'bg-[#F7FBFE] dark:bg-slate-800/80 border-[#A9DDF5] dark:border-slate-700 hover:bg-[#EEF7FC] dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${
                      currentUser.role === 'general_manager'
                        ? 'bg-gradient-to-br from-[#483878] to-[#E8742A]'
                        : 'bg-gradient-to-br from-[#483878] to-[#4A9FD8]'
                    }`}
                  >
                    <span className="font-black text-xs">
                      {currentUser.role === 'general_manager'
                        ? 'GM'
                        : currentUser.displayName.slice(0, 2)}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#483878] dark:text-slate-100 leading-tight max-w-[140px] truncate">
                    {currentUser.displayName}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#483878] dark:text-slate-300 transition-transform duration-200 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 xl:right-auto xl:left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#131C31] border border-[#A9DDF5] dark:border-slate-700 shadow-lg p-2 z-50"
                  >
                    <div className="px-3 py-2 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5]/70 dark:border-slate-700 mb-1.5">
                      <span className="block text-xs font-bold text-[#444444] dark:text-slate-400">
                        الدور الوظيفي
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Shield className="w-3.5 h-3.5 text-[#E8742A] shrink-0" />
                        <span className="text-xs font-black text-[#483878] dark:text-slate-100">
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
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#D92D20] hover:bg-[#D92D20]/10 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#D92D20]"
                      >
                        <span>تسجيل الخروج</span>
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Left Section: Live Makkah Weather & Digital Clock (with Live Green Dot) + Theme & Fullscreen Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10 w-full xl:w-auto justify-between xl:justify-end">
          {/* Unified Temperature + Live Arabic Date & Digital Clock Box */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 bg-[#F7FBFE] dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700 shadow-sm">
            {/* Temperature Only */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#F5B13D]/15 border border-[#F5B13D]/40 flex items-center justify-center text-[#F5B13D] shrink-0">
                <Sun className="w-4 h-4 animate-pulse" />
              </div>
              <span
                dir="ltr"
                className="font-mono tabular-nums text-sm sm:text-base font-black text-[#483878] dark:text-slate-100 leading-none"
              >
                26°C
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="hidden sm:block h-7 w-px bg-[#A9DDF5] dark:bg-slate-700 shrink-0" />

            {/* Live Arabic Date & Digital Clock with Pulsing "مباشر" Indicator */}
            <div className="flex flex-col items-center sm:items-end justify-center min-w-[180px]">
              <div className="flex items-center justify-between gap-2 w-full text-xs text-[#444444] dark:text-slate-300 font-bold mb-0.5 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#4A9FD8] shrink-0" />
                  <span>{arabicDateStr}</span>
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#22A06B]/10 border border-[#22A06B]/30 text-xs font-extrabold text-[#22A06B] leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] dot-pulse-live shrink-0" />
                  <span>مباشر</span>
                </span>
              </div>

              <div
                dir="ltr"
                className="font-mono tabular-nums text-lg sm:text-xl font-black text-[#483878] dark:text-slate-100 tracking-tight flex items-baseline justify-center w-full select-none leading-tight"
              >
                <span>{timeStr}</span>
                <span className="text-[#E8742A] text-sm sm:text-base font-bold ml-0.5">
                  :{secondsStr}
                </span>
              </div>
            </div>
          </div>

          {/* Action Icon Buttons: Dark Mode Toggle + Icon-only Fullscreen */}
          <div className="flex items-center gap-1.5">
            {onToggleDark && (
              <button
                type="button"
                onClick={onToggleDark}
                className="p-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/80 hover:bg-[#A9DDF5]/30 dark:hover:bg-slate-700 text-[#483878] dark:text-[#F5B13D] transition-colors cursor-pointer active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8]"
                title={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
                aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#4A9FD8] ${
                isFullscreen
                  ? 'bg-[#E8742A] text-white shadow-sm'
                  : 'bg-[#F7FBFE] dark:bg-slate-800/80 hover:bg-[#A9DDF5]/30 dark:hover:bg-slate-700 text-[#483878] dark:text-[#A9DDF5] hover:text-[#E8742A]'
              }`}
              title={isFullscreen ? 'الخروج من ملء الشاشة (Esc)' : 'تفعيل وضع ملء الشاشة'}
              aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'تفعيل وضع ملء الشاشة'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 shrink-0" />
              ) : (
                <Maximize className="w-5 h-5 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

