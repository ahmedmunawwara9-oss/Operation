import React from 'react';
import { Clock } from 'lucide-react';
import { Trip } from '../types';

interface UpcomingDeparturesBoardProps {
  trips: Trip[];
  currentTime: Date;
  onSelectTrip?: (trip: Trip) => void;
  maxRows?: number;
  isTVMode?: boolean;
}

export const UpcomingDeparturesBoard: React.FC<UpcomingDeparturesBoardProps> = ({
  trips,
  currentTime,
  onSelectTrip,
}) => {
  const currentMs = currentTime.getTime();

  // Filter upcoming trips
  const upcomingTrips = trips
    .filter((t) => {
      const depMs = new Date(t.departureDateTime).getTime();
      return currentMs < depMs;
    })
    .sort((a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime())
    .slice(0, 5);

  return (
    <div className="w-full bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm relative select-none flex flex-col justify-between">
      {/* Box Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-black text-[#483878] dark:text-slate-100">
            الرحلات القادمة
          </h2>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-slate-200 text-xs font-bold">
              <th className="py-2.5 px-2">رقم الرحلة</th>
              <th className="py-2.5 px-2">رقم الحافلة</th>
              <th className="py-2.5 px-2">الوجهة</th>
              <th className="py-2.5 px-2 text-center">وقت المغادرة</th>
              <th className="py-2.5 px-2 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#A9DDF5]/40 dark:divide-slate-700/70">
            {upcomingTrips.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#444444] dark:text-slate-300 text-xs sm:text-sm font-medium">
                  لا توجد رحلات قادمة مسجلة حالياً
                </td>
              </tr>
            ) : (
              upcomingTrips.map((trip) => {
                const depDate = new Date(trip.departureDateTime);
                const diffMin = Math.round((depDate.getTime() - currentMs) / 60000);

                // Strictly separated status colors (#2E7CF6 info, #E5A100 warning, #D92D20 urgent)
                let badgeStyle = 'bg-[#2E7CF6]/10 text-[#2E7CF6] dark:text-[#60A5FA] border-[#2E7CF6]/30 font-bold';
                let badgeText = 'مجدولة';

                if (diffMin > 0 && diffMin <= 15) {
                  badgeStyle = 'bg-[#D92D20]/10 text-[#D92D20] dark:text-red-300 border-[#D92D20]/35 font-bold';
                  badgeText = `تنطلق بعد ${diffMin} دقائق`;
                } else if (diffMin > 0 && diffMin <= 45) {
                  badgeStyle = 'bg-[#E5A100]/12 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/40 font-semibold';
                  badgeText = `تنطلق بعد ${diffMin} دقيقة`;
                } else if (diffMin > 0 && diffMin <= 90) {
                  badgeStyle = 'bg-[#E5A100]/12 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/40 font-semibold';
                  badgeText = `تنطلق بعد 1 ساعة`;
                }

                return (
                  <tr
                    key={trip.id}
                    onClick={() => onSelectTrip && onSelectTrip(trip)}
                    className="hover:bg-[#EEF7FC] dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-2 font-mono font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                      {trip.tripNumber}
                    </td>
                    <td className="py-2.5 px-2 font-mono font-semibold text-[#4A9FD8] dark:text-[#A9DDF5] whitespace-nowrap">
                      {trip.busId}
                    </td>
                    <td className="py-2.5 px-2 text-[#444444] dark:text-slate-200 font-semibold whitespace-nowrap">
                      {trip.destination}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-[#483878] dark:text-slate-100 whitespace-nowrap">
                      {trip.departureTime}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs border ${badgeStyle}`}
                      >
                        {badgeText}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
