import React, { useState, useEffect } from 'react';
import {
  Tv,
  Pause,
  Play,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  Calendar,
  Bus,
  Layers,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { Trip, AppSettings, DataSourceType, OperationalAlert } from '../types';
import { ScheduleKPIs } from '../services/scheduleEngine';
import { formatArabicDate, formatDigitalClock } from '../services/dateTimeUtils';
import { KPICards } from './KPICards';
import { AnimatedBusMovementCenter } from './AnimatedBusMovementCenter';
import { UpcomingDeparturesBoard } from './UpcomingDeparturesBoard';
import { DailyTripTimeline } from './DailyTripTimeline';
import { OperationalAnalytics } from './OperationalAnalytics';
import { AlertCenter } from './AlertCenter';

interface TVModeProps {
  trips: Trip[];
  kpis: ScheduleKPIs;
  alerts: OperationalAlert[];
  currentTime: Date;
  settings: AppSettings;
  dataSource: DataSourceType;
  onExitTVMode: () => void;
  onSelectTrip: (trip: Trip) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onAcknowledgeAll: () => void;
}

type TVScreenId = 'overview' | 'movement' | 'departures' | 'timeline' | 'analytics';

interface TVScreenDef {
  id: TVScreenId;
  label: string;
  icon: any;
}

const SCREENS: TVScreenDef[] = [
  { id: 'overview', label: 'لوحة العمليات المتكاملة', icon: Layers },
  { id: 'movement', label: 'حركة الحافلات التقديرية', icon: Bus },
  { id: 'departures', label: 'شاشة المغادرة', icon: Timer },
  { id: 'timeline', label: 'المخطط الزمني 24h', icon: Clock },
  { id: 'analytics', label: 'التنبيهات والمؤشرات', icon: TrendingUp },
];

export const TVMode: React.FC<TVModeProps> = ({
  trips,
  kpis,
  alerts,
  currentTime,
  settings,
  dataSource,
  onExitTVMode,
  onSelectTrip,
  onAcknowledgeAlert,
  onAcknowledgeAll,
}) => {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!settings.autoRotateTV);
  const [timerProgress, setTimerProgress] = useState(0);

  const rotationSec = settings.tvRotationInterval || 20;
  const currentScreen = SCREENS[activeScreenIndex] || SCREENS[0];

  const { timeStr, secondsStr, periodStr } = formatDigitalClock(currentTime, settings.timeZone);
  const dateStr = formatArabicDate(currentTime, settings.timeZone);

  // Rotation cycle timer
  useEffect(() => {
    if (isPaused) {
      setTimerProgress(0);
      return;
    }

    const intervalStepMs = 200;
    const totalSteps = (rotationSec * 1000) / intervalStepMs;

    const interval = setInterval(() => {
      setTimerProgress((prev) => {
        const next = prev + 100 / totalSteps;
        if (next >= 100) {
          setActiveScreenIndex((s) => (s + 1) % SCREENS.length);
          return 0;
        }
        return next;
      });
    }, intervalStepMs);

    return () => clearInterval(interval);
  }, [isPaused, rotationSec, activeScreenIndex]);

  const handleNextScreen = () => {
    setActiveScreenIndex((s) => (s + 1) % SCREENS.length);
    setTimerProgress(0);
  };

  const handlePrevScreen = () => {
    setActiveScreenIndex((s) => (s - 1 + SCREENS.length) % SCREENS.length);
    setTimerProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F7FBFE] dark:bg-[#0B1120] text-[#444444] dark:text-slate-200 flex flex-col overflow-hidden select-none">
      {/* TV Header */}
      <div className="w-full bg-white dark:bg-[#131C31] border-b border-[#A9DDF5] dark:border-slate-700 px-8 py-3.5 flex items-center justify-between shadow-sm shrink-0 relative">
        <div className="absolute top-0 left-0 right-0 h-1 gradient-brand-ribbon" />
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-[#483878] p-0.5 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-[#131C31] rounded-[14px] flex items-center justify-center">
              <Bus className="w-7 h-7 text-[#483878] dark:text-[#A9DDF5]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-[#483878] dark:text-white">
                {settings.companyName || 'درة المنورة للنقليات'}
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#A9DDF5]/35 dark:bg-slate-800 text-[#483878] dark:text-[#A9DDF5] border border-[#4A9FD8]/50 dark:border-slate-600">
                وضع البث المباشر TV
              </span>
            </div>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5 font-semibold">
              شاشة العرض: <strong className="text-[#E8742A]">{currentScreen.label}</strong>
            </p>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-4 bg-[#F7FBFE] dark:bg-slate-800/80 px-6 py-2 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-[#444444] dark:text-slate-300">
            <Calendar className="w-4 h-4 text-[#4A9FD8]" />
            <span className="font-semibold text-[#483878] dark:text-slate-100">{dateStr}</span>
          </div>
          <div className="w-px h-6 bg-[#A9DDF5] dark:bg-slate-700" />
          <div className="flex items-baseline font-mono text-2xl font-black text-[#483878] dark:text-white tracking-tight">
            <span>{timeStr}</span>
            <span className="text-[#E8742A] text-sm font-bold mx-1">:{secondsStr}</span>
            <span className="text-xs text-[#444444] dark:text-slate-300 font-sans mr-1">{periodStr}</span>
          </div>
        </div>

        {/* Screen Controls */}
        <div className="flex items-center gap-3">
          {/* Screens Tabs */}
          <div className="flex items-center gap-1 bg-[#EEF7FC] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 p-1 rounded-xl text-xs font-bold">
            {SCREENS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === activeScreenIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveScreenIndex(idx);
                    setTimerProgress(0);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E8742A] text-white shadow-sm'
                      : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Pause / Play */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isPaused
                ? 'bg-[#E8742A] text-white border-[#E8742A]'
                : 'bg-white dark:bg-slate-800 text-[#483878] dark:text-slate-100 border-[#A9DDF5] dark:border-slate-700 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 shadow-sm'
            }`}
            title={isPaused ? 'استئناف التدوير' : 'إيقاف مؤقت'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevScreen}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextScreen}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-slate-100 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Exit TV Mode */}
          <button
            onClick={onExitTVMode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#483878] text-white hover:bg-[#3a2c63] transition-colors shadow-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>خروج من TV</span>
          </button>
        </div>
      </div>

      {/* Rotation Progress Bar */}
      {!isPaused && (
        <div className="w-full h-1 bg-[#EEF7FC] dark:bg-slate-800">
          <div
            className="h-full gradient-brand-ribbon transition-all duration-200 ease-linear"
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {currentScreen.id === 'overview' && (
          <div className="space-y-5">
            <KPICards kpis={kpis} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <AnimatedBusMovementCenter
                  trips={trips}
                  currentTime={currentTime}
                  onSelectTrip={onSelectTrip}
                  pageSize={6}
                  isTVMode
                />
              </div>
              <div className="lg:col-span-5">
                <UpcomingDeparturesBoard
                  trips={trips}
                  currentTime={currentTime}
                  onSelectTrip={onSelectTrip}
                  maxRows={8}
                  isTVMode
                />
              </div>
            </div>
          </div>
        )}

        {currentScreen.id === 'movement' && (
          <div className="space-y-4">
            <KPICards kpis={kpis} />
            <AnimatedBusMovementCenter
              trips={trips}
              currentTime={currentTime}
              onSelectTrip={onSelectTrip}
              pageSize={10}
              isTVMode
            />
          </div>
        )}

        {currentScreen.id === 'departures' && (
          <div className="space-y-4">
            <KPICards kpis={kpis} />
            <UpcomingDeparturesBoard
              trips={trips}
              currentTime={currentTime}
              onSelectTrip={onSelectTrip}
              maxRows={12}
              isTVMode
            />
          </div>
        )}

        {currentScreen.id === 'timeline' && (
          <div className="space-y-4">
            <KPICards kpis={kpis} />
            <DailyTripTimeline
              trips={trips}
              currentTime={currentTime}
              onSelectTrip={onSelectTrip}
            />
          </div>
        )}

        {currentScreen.id === 'analytics' && (
          <div className="space-y-5">
            <KPICards kpis={kpis} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AlertCenter
                alerts={alerts}
                onAcknowledgeAlert={onAcknowledgeAlert}
                onAcknowledgeAll={onAcknowledgeAll}
              />
              <OperationalAnalytics trips={trips} />
            </div>
          </div>
        )}
      </div>

      {/* TV Screen Footer */}
      <div className="bg-white dark:bg-[#131C31] border-t border-[#A9DDF5] dark:border-slate-700 px-8 py-2.5 flex items-center justify-between text-xs text-[#444444] dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B] animate-ping" />
          <span className="font-semibold text-[#483878] dark:text-slate-100">
            درة المنورة للنقليات · بث مباشر ومحدث لحظياً · التدوير كل {rotationSec} ثانية
          </span>
        </div>
        <div className="flex items-center gap-4 text-[#444444] dark:text-slate-300">
          <span>حركة الحافلات تقديرية استناداً إلى الجدول الزمني المنقضي</span>
          <span>© درة المنورة للنقليات</span>
        </div>
      </div>
    </div>
  );
};
