import React from 'react';
import {
  Bus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Navigation,
  Route,
  ChevronLeft,
} from 'lucide-react';
import { ScheduleKPIs } from '../services/scheduleEngine';

interface KPICardsProps {
  kpis: ScheduleKPIs;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
  onOpenDelayedDrawer?: () => void;
  operationalDate?: string;
}

export const KPICards: React.FC<KPICardsProps> = ({
  kpis,
  activeFilter = 'all',
  onSelectFilter,
  onOpenDelayedDrawer,
  operationalDate,
}) => {
  const delayedCount = kpis.delayedConfirmedTrips + kpis.unconfirmedExceededTrips;
  const dailyCompletionPercent =
    kpis.totalTrips > 0 ? Math.round((kpis.completedTrips / kpis.totalTrips) * 100) : 0;

  const cards = [
    {
      id: 'all',
      title: 'إجمالي الرحلات اليوم',
      value: kpis.totalTrips,
      subtitle: operationalDate ? `جدول اليوم (${operationalDate})` : 'جدول اليوم المعتمد',
      icon: Route,
      topBar: 'bg-[#483878]',
      valueColor: 'text-[#483878] dark:text-slate-100',
    },
    {
      id: 'in_progress',
      title: 'الحافلات على الطريق',
      value: kpis.inProgressTrips,
      subtitle: 'حركة تقديرية مباشرة',
      icon: Navigation,
      topBar: 'bg-[#4A9FD8]',
      valueColor: 'text-[#483878] dark:text-slate-100',
    },
    {
      id: 'upcoming',
      title: 'الرحلات القادمة',
      value: kpis.upcomingTrips,
      subtitle: 'المجدولة بالساعات القادمة',
      icon: Clock,
      topBar: 'bg-[#4A9FD8]',
      valueColor: 'text-[#483878] dark:text-slate-100',
    },
    {
      id: 'completed',
      title: 'الرحلات المكتملة',
      value: kpis.completedTrips,
      subtitle: 'وصلت محطة الوصول',
      icon: CheckCircle2,
      topBar: 'bg-[#22A06B]',
      valueColor: 'text-[#22A06B]',
    },
    {
      id: 'delayed',
      title: 'الرحلات المتأخرة',
      value: delayedCount,
      subtitle: delayedCount > 0 ? 'تتطلب فحصاً ومتابعة فورية' : 'لا توجد رحلات متأخرة حالياً',
      icon: AlertTriangle,
      topBar: delayedCount > 0 ? 'bg-[#D92D20]' : 'bg-slate-300 dark:bg-slate-600',
      valueColor: delayedCount > 0 ? 'text-[#D92D20]' : 'text-[#483878] dark:text-slate-200',
    },
    {
      id: 'fleet',
      title: 'إجمالي الحافلات',
      value: kpis.uniqueBusesCount,
      subtitle: 'أسطول درة المنورة',
      icon: Bus,
      topBar: 'bg-[#483878]',
      valueColor: 'text-[#483878] dark:text-slate-100',
    },
  ];

  const hasActiveTrips = kpis.inProgressTrips > 0;

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-3 sm:gap-3.5 mb-3.5 select-none items-stretch">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isSelected = activeFilter === card.id;
        const isDelayedCard = card.id === 'delayed';
        const isCompletedCard = card.id === 'completed';
        const isPulsingActive =
          hasActiveTrips && (card.id === 'in_progress' || (card.id === 'all' && card.value > 0));
        const hasDelays = isDelayedCard && delayedCount > 0;

        const handleCardClick = () => {
          if (isDelayedCard && onOpenDelayedDrawer) {
            onOpenDelayedDrawer();
          } else if (onSelectFilter) {
            onSelectFilter(card.id);
          }
        };

        return (
          <button
            key={card.id}
            type="button"
            onClick={handleCardClick}
            className={`min-w-0 w-full group relative rounded-2xl text-right flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden shadow-sm ${
              isDelayedCard
                ? hasDelays
                  ? 'col-span-2 sm:col-span-1 p-4 sm:p-4.5 min-h-[132px] bg-[#D92D20]/[0.07] dark:bg-[#D92D20]/15 backdrop-blur-md border-2 border-[#D92D20] card-delayed-pulse'
                  : 'col-span-2 sm:col-span-1 p-4 sm:p-4.5 min-h-[132px] bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                : `card-white p-3.5 sm:p-4 min-h-[124px] bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md hover:-translate-y-0.5 ${
                    isPulsingActive
                      ? 'card-white-pulse-active'
                      : 'border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]'
                  }`
            } ${isSelected && !isDelayedCard ? 'ring-2 ring-offset-1 ring-[#E8742A] shadow-md' : ''}`}
          >
            {/* Top Accent Bar */}
            <div
              className={`absolute top-0 left-0 right-0 z-20 ${
                isDelayedCard ? 'h-[5px]' : 'h-[4px]'
              } ${card.topBar}`}
            />

            {/* Top Row: Title + Unified Translucent Navy Icon Container */}
            <div className="flex items-start justify-between gap-2 w-full mb-2 pt-1 relative z-10">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-black leading-snug transition-colors ${
                      isDelayedCard
                        ? hasDelays
                          ? 'text-sm sm:text-base text-[#D92D20]'
                          : 'text-sm sm:text-base text-[#483878] dark:text-slate-100'
                        : 'text-xs sm:text-sm text-[#483878] dark:text-slate-100'
                    }`}
                  >
                    {card.title}
                  </span>
                  {card.id === 'in_progress' && hasActiveTrips && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-[#22A06B] dot-pulse-live shrink-0"
                      title="رحلات نشطة جارية الآن"
                    />
                  )}
                  {hasDelays && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-[#D92D20] animate-ping shrink-0"
                      title="توجد رحلات متأخرة تتطلب المتابعة"
                    />
                  )}
                </div>
                <span
                  className={`text-xs font-semibold leading-tight mt-0.5 ${
                    hasDelays
                      ? 'text-[#D92D20] dark:text-red-300'
                      : 'text-[#444444] dark:text-slate-300'
                  }`}
                >
                  {card.subtitle}
                </span>
              </div>

              {/* Unified Translucent Navy Icon Background (#483878/10) */}
              <div
                className={`rounded-xl flex items-center justify-center shrink-0 bg-[#483878]/10 dark:bg-[#483878]/40 text-[#483878] dark:text-[#A9DDF5] border border-[#483878]/15 dark:border-[#A9DDF5]/20 group-hover:scale-105 transition-transform ${
                  isDelayedCard ? 'w-10 h-10' : 'w-8 h-8 sm:w-9 sm:h-9'
                }`}
              >
                <IconComponent
                  className={isDelayedCard ? 'w-5 h-5 stroke-[2.2]' : 'w-4 h-4 stroke-[2.2]'}
                />
              </div>
            </div>

            {/* Bottom Content */}
            {isCompletedCard ? (
              /* Completed Trips + Daily Completion % Side-by-Side (Status Green #22A06B) */
              <div className="relative z-10 flex items-end justify-between gap-3 pt-1">
                <div className="text-right flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-mono font-black text-[#22A06B] tracking-tight leading-none">
                    {card.value}
                  </span>
                  <span className="text-xs font-bold text-[#444444] dark:text-slate-300">رحلة</span>
                </div>

                {/* Daily Completion Percentage + Mini Progress Bar */}
                <div className="flex-1 min-w-[96px] max-w-[140px] bg-[#22A06B]/[0.07] dark:bg-[#22A06B]/15 rounded-xl p-2 border border-[#22A06B]/25">
                  <div className="flex items-center justify-between gap-1 text-xs font-extrabold mb-1">
                    <span className="text-[#444444] dark:text-slate-200">الإنجاز اليومي</span>
                    <span className="font-mono font-black text-[#22A06B]">
                      {dailyCompletionPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#22A06B]/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#22A06B] rounded-full transition-all duration-500"
                      style={{ width: `${dailyCompletionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : isDelayedCard ? (
              /* Delayed Trips Display: Red only when > 0, neutral when 0 */
              <div className="relative z-10 flex items-end justify-between gap-2 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl sm:text-5xl font-mono font-black tracking-tight leading-none ${card.valueColor}`}>
                    {card.value}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-extrabold ${
                      hasDelays ? 'text-[#D92D20]' : 'text-[#444444] dark:text-slate-300'
                    }`}
                  >
                    رحلة
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition-colors border ${
                    hasDelays
                      ? 'bg-white dark:bg-slate-900 border-[#D92D20]/50 text-[#D92D20] group-hover:bg-[#D92D20] group-hover:text-white group-hover:border-[#D92D20]'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-[#444444] dark:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'
                  }`}
                >
                  <span>قائمة المتأخرة</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </span>
              </div>
            ) : (
              /* Standard KPI Value Display */
              <div className="text-right py-0.5 relative z-10 flex items-baseline justify-between">
                <span className={`text-3xl sm:text-4xl font-mono font-black tracking-tight leading-none group-hover:scale-[1.02] origin-right transition-transform ${card.valueColor}`}>
                  {card.value}
                </span>
                <span className="text-xs font-bold text-[#444444] dark:text-slate-300 transition-colors">
                  {card.id === 'fleet' ? 'حافلة' : 'رحلة'}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

