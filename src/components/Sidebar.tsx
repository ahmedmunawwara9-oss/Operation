import React from 'react';
import {
  Home,
  Bus,
  Calendar,
  Bell,
  BarChart3,
  CheckCircle2,
  Users,
  FileSpreadsheet,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenImport: () => void;
  onOpenSettings?: () => void;
  alertCount: number;
  isGeneralManager?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenImport,
  alertCount,
  isGeneralManager = false,
}) => {
  const getNavBtnClass = (isActive: boolean) =>
    isActive
      ? 'bg-[#E8742A] text-white shadow-sm font-black'
      : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white hover:bg-[#A9DDF5]/30 dark:hover:bg-slate-800 border border-transparent font-bold';

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-40 flex flex-row items-center justify-around bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md border-t border-[#A9DDF5] dark:border-slate-700 rounded-t-2xl px-1.5 py-1.5 shadow-lg md:static md:w-32 md:flex-col md:justify-between md:rounded-2xl md:border md:p-2.5 md:shadow-sm shrink-0 select-none">
      {/* Navigation Buttons */}
      <div className="w-full flex flex-row md:flex-col items-stretch justify-around md:justify-start gap-1 md:gap-2">
        {/* 1. لوحة العمليات */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'dashboard'
          )}`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">لوحة العمليات</span>
        </button>

        {/* 2. حركة الحافلات */}
        <button
          type="button"
          onClick={() => onSelectTab('movement')}
          className={`flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'movement'
          )}`}
        >
          <Bus className="w-5 h-5 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">حركة الحافلات</span>
        </button>

        {/* 3. جدول الرحلات */}
        <button
          type="button"
          onClick={() => onSelectTab('schedule')}
          className={`flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'schedule'
          )}`}
        >
          <Calendar className="w-5 h-5 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">جدول الرحلات</span>
        </button>

        {/* 4. التنبيهات */}
        <button
          type="button"
          onClick={() => onSelectTab('alerts')}
          className={`flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs relative cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'alerts'
          )}`}
        >
          {alertCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectTab('alerts');
              }}
              title="فتح قائمة التنبيهات كاملة"
              className="absolute top-0.5 right-1 md:top-1.5 md:right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D92D20] text-white text-[11px] font-mono font-bold flex items-center justify-center shadow-sm cursor-pointer"
            >
              {alertCount}
            </span>
          )}
          <Bell className="w-5 h-5 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">التنبيهات</span>
        </button>

        {/* 5. التحليلات */}
        <button
          type="button"
          onClick={() => onSelectTab('analytics')}
          className={`flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'analytics'
          )}`}
        >
          <BarChart3 className="w-5 h-5 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">التحليلات</span>
        </button>

        {/* 6. المستخدمين (General Manager Only) */}
        {isGeneralManager && (
          <button
            type="button"
            onClick={() => onSelectTab('users')}
            className={`flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer text-center ${getNavBtnClass(
              activeTab === 'users'
            )}`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">المستخدمين</span>
          </button>
        )}

        {/* 7. استيراد */}
        <button
          type="button"
          onClick={onOpenImport}
          className="flex-1 md:flex-none md:w-full py-2 md:py-3 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold text-[#483878] dark:text-[#A9DDF5] hover:text-[#E8742A] hover:bg-[#A9DDF5]/25 dark:hover:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-800/80 shadow-sm cursor-pointer text-center"
          title="استيراد وتحديث جدول إكسل"
        >
          <FileSpreadsheet className="w-5 h-5 shrink-0 text-[#483878] dark:text-[#A9DDF5]" />
          <span className="text-[11px] sm:text-xs leading-tight whitespace-nowrap">استيراد</span>
        </button>
      </div>

      {/* Bottom Status Indicator: النظام يعمل (Desktop sidebar only) */}
      <div className="hidden md:block w-full mt-4 pt-3 border-t border-[#A9DDF5]/70 dark:border-slate-700">
        <div className="w-full py-2 px-1.5 rounded-xl bg-[#22A06B]/10 border border-[#22A06B]/30 flex items-center justify-center gap-1.5 text-[#22A06B] font-bold text-xs shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#22A06B] shrink-0" />
          <span className="whitespace-nowrap">النظام يعمل</span>
        </div>
      </div>
    </aside>
  );
};
