import React from 'react';
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
  void operationalDate;

  const delayedCount = kpis.delayedConfirmedTrips + kpis.unconfirmedExceededTrips;

  const cards = [
    {
      id: 'all',
      title: 'رحلات اليوم',
      value: kpis.totalTrips,
      isFirst: true,
    },
    {
      id: 'in_progress',
      title: 'على الطريق',
      value: kpis.inProgressTrips,
      isFirst: false,
    },
    {
      id: 'upcoming',
      title: 'قادمة',
      value: kpis.upcomingTrips,
      isFirst: false,
    },
    {
      id: 'completed',
      title: 'مكتملة',
      value: kpis.completedTrips,
      isFirst: false,
    },
    {
      id: 'delayed',
      title: 'متأخرة',
      value: delayedCount,
      isFirst: false,
    },
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 select-none items-stretch">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;
        const isDelayedCard = card.id === 'delayed';
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
            className={`min-w-0 w-full rounded-2xl p-5 text-right flex flex-col justify-between gap-3 transition-all cursor-pointer ${
              hasDelays
                ? 'bg-[#D92D20]/[0.06] dark:bg-[#D92D20]/15 border border-[#D92D20]/45 dark:border-[#D92D20]/60 card-delayed-pulse'
                : 'card-white hover:border-[#4A9FD8]'
            } ${
              card.isFirst ? 'border-t-[3px] border-t-[#E8742A]' : ''
            } ${isSelected && !isDelayedCard ? 'ring-2 ring-[#4A9FD8]/50' : ''}`}
          >
            <span
              className={`text-[15px] font-bold leading-snug ${
                hasDelays
                  ? 'text-[#D92D20] dark:text-red-300'
                  : 'text-[#444444] dark:text-slate-300'
              }`}
            >
              {card.title}
            </span>

            <span
              className={`text-[40px] font-extrabold font-mono tabular-nums leading-none ${
                hasDelays
                  ? 'text-[#D92D20] dark:text-red-400'
                  : 'text-[#483878] dark:text-slate-100'
              }`}
            >
              {card.value}
            </span>
          </button>
        );
      })}
    </div>
  );
};
