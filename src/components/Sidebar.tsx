import React from 'react';
import {
  Home,
  Bus,
  Calendar,
  Bell,
  BarChart3,
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
  onOpenSettings,
  alertCount,
  isGeneralManager = false,
}) => {
  void onOpenSettings;

  const getNavBtnClass = (isActive: boolean) =>
    isActive
      ? 'bg-[#E8742A] text-white shadow-sm font-bold'
      : 'text-[#1E293B] dark:text-slate-200 hover:text-[#483878] dark:hover:text-white hover:bg-[#A9DDF5]/25 dark:hover:bg-slate-800 font-semibold';

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-40 flex flex-row items-center justify-around bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md border-t border-[#A9DDF5] dark:border-slate-700 rounded-t-2xl px-1.5 py-1.5 shadow-lg md:static md:w-[104px] md:flex-col md:justify-between md:rounded-2xl md:border md:p-2.5 md:shadow-sm shrink-0 select-none">
      {/* Navigation Buttons */}
      <nav aria-label="التنقل الرئيسي" className="w-full flex flex-row md:flex-col items-stretch justify-around md:justify-start gap-1 md:gap-2">
        {/* 1. العمليات */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'dashboard'
          )}`}
        >
          <Home className="w-6 h-6 shrink-0" />
          <span className="text-[13px] leading-tight whitespace-nowrap">العمليات</span>
        </button>

        {/* 2. الحافلات */}
        <button
          type="button"
          onClick={() => onSelectTab('movement')}
          className={`flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'movement'
          )}`}
        >
          <Bus className="w-6 h-6 shrink-0" />
          <span className="text-[13px] leading-tight whitespace-nowrap">الحافلات</span>
        </button>

        {/* 3. الجدول */}
        <button
          type="button"
          onClick={() => onSelectTab('schedule')}
          className={`flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'schedule'
          )}`}
        >
          <Calendar className="w-6 h-6 shrink-0" />
          <span className="text-[13px] leading-tight whitespace-nowrap">الجدول</span>
        </button>

        {/* 4. التنبيهات */}
        <button
          type="button"
          onClick={() => onSelectTab('alerts')}
          className={`flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors relative cursor-pointer text-center ${getNavBtnClass(
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
              className="absolute top-1 right-1 md:top-1.5 md:right-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#D92D20] text-white text-[13px] font-mono font-bold flex items-center justify-center shadow-xs cursor-pointer"
            >
              {alertCount}
            </span>
          )}
          <Bell className="w-6 h-6 shrink-0" />
          <span className="text-[13px] leading-tight whitespace-nowrap">التنبيهات</span>
        </button>

        {/* 5. التحليلات */}
        <button
          type="button"
          onClick={() => onSelectTab('analytics')}
          className={`flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${getNavBtnClass(
            activeTab === 'analytics'
          )}`}
        >
          <BarChart3 className="w-6 h-6 shrink-0" />
          <span className="text-[13px] leading-tight whitespace-nowrap">التحليلات</span>
        </button>

        {/* 6. المستخدمون (General Manager Only) */}
        {isGeneralManager && (
          <button
            type="button"
            onClick={() => onSelectTab('users')}
            className={`flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${getNavBtnClass(
              activeTab === 'users'
            )}`}
          >
            <Users className="w-6 h-6 shrink-0" />
            <span className="text-[13px] leading-tight whitespace-nowrap">المستخدمون</span>
          </button>
        )}

        {/* 7. استيراد */}
        <button
          type="button"
          onClick={onOpenImport}
          className="flex-1 md:flex-none md:w-full py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors font-semibold text-[#2E2252] dark:text-[#A9DDF5] hover:text-[#E8742A] hover:bg-[#A9DDF5]/20 dark:hover:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 bg-[#F7FBFE] dark:bg-slate-800/70 cursor-pointer text-center"
          title="استيراد وتحديث جدول إكسل"
        >
          <FileSpreadsheet className="w-6 h-6 shrink-0" />
          <span className="text-[13px] leading-tight whitespace-nowrap">استيراد</span>
        </button>
      </nav>

      {/* Bottom Status Indicator: النظام يعمل (Desktop sidebar only) */}
      <div className="hidden md:flex w-full mt-4 pt-3 border-t border-[#A9DDF5]/60 dark:border-slate-700 items-center justify-center gap-1.5 text-[#22A06B] dark:text-emerald-400 font-bold text-[13px]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B] shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">النظام يعمل</span>
      </div>
    </aside>
  );
};
