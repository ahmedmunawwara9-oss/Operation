import React from 'react';
import {
  TrendingUp,
  Tv,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Trip, OperationalAlert } from '../types';

interface BottomPanelsProps {
  trips: Trip[];
  alerts: OperationalAlert[];
  hideAlertsPanel?: boolean;
}

export const BottomPanels: React.FC<BottomPanelsProps> = ({
  trips,
  alerts,
  hideAlertsPanel = false,
}) => {
  // 1. Status counts for Donut Chart
  let completed = 0;
  let inProgress = 0;
  let upcoming = 0;
  let delayed = 0;

  trips.forEach((t) => {
    if (t.status === 'completed_scheduled' || t.status === 'completed_actual') completed++;
    else if (t.status === 'in_progress_scheduled' || t.status === 'started_actual') inProgress++;
    else if (t.status === 'scheduled_upcoming') upcoming++;
    else if (t.status === 'delayed_confirmed' || t.status === 'needs_confirmation' || t.status === 'conflict')
      delayed++;
  });

  const total = trips.length;

  const donutData = [
    { name: 'مكتملة', value: completed, color: '#22A06B' }, // أخضر الحالة
    { name: 'جارية الآن', value: inProgress, color: '#2E7CF6' }, // أزرق الحالة
    { name: 'قادمة', value: upcoming, color: '#4A9FD8' }, // أزرق فاتح
    { name: 'متأخرة', value: delayed, color: '#D92D20' }, // أحمر الحالة
  ];

  // If completely empty, show an empty light ring placeholder
  const emptyDonutPlaceholder = [{ name: 'فارغ', value: 1, color: '#E2E8F0' }];

  // 2. Hourly distribution for Bar Chart covering full operational day 00:00 (12 AM) to 24:00 (00 night)
  const targetHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const barData = targetHours.map((hour) => {
    const label = `${String(hour).padStart(2, '0')}:00`;
    let count = 0;
    trips.forEach((t) => {
      const depHour = parseInt(t.departureTime?.split(':')[0] || '0', 10);
      if (depHour >= hour && depHour < hour + 2) {
        count++;
      }
    });
    return {
      hour: label,
      رحلات: count,
    };
  });

  // Display alerts
  const displayAlerts = alerts.slice(0, 4);

  return (
    <div
      className={`grid grid-cols-1 ${
        hideAlertsPanel ? 'md:grid-cols-2' : 'md:grid-cols-3'
      } gap-3.5 select-none`}
    >
      {/* 1. Left Card: حالة الرحلات اليوم (Donut Chart) */}
      <div className="bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 pb-2 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#483878] dark:text-slate-100">حالة الرحلات اليوم</h3>
        </div>

        <div className="flex items-center justify-between gap-2 h-44">
          {/* Donut chart */}
          <div className="w-1/2 h-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? donutData.filter((d) => d.value > 0) : emptyDonutPlaceholder}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={56}
                  strokeWidth={0}
                  paddingAngle={total > 0 ? 3 : 0}
                >
                  {(total > 0 ? donutData.filter((d) => d.value > 0) : emptyDonutPlaceholder).map(
                    (entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    )
                  )}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Total Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black font-mono text-[#483878] dark:text-slate-100 leading-none">
                {total}
              </span>
              <span className="text-xs text-[#444444] dark:text-slate-300 font-bold mt-0.5">رحلة</span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-1/2 space-y-2 pr-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B]" />
                <span className="text-[#444444] dark:text-slate-200 font-semibold">مكتملة</span>
              </div>
              <span className="font-mono font-bold text-[#483878] dark:text-slate-100">{completed}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7CF6]" />
                <span className="text-[#444444] dark:text-slate-200 font-semibold">جارية الآن</span>
              </div>
              <span className="font-mono font-bold text-[#483878] dark:text-slate-100">{inProgress}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4A9FD8]" />
                <span className="text-[#444444] dark:text-slate-200 font-semibold">قادمة</span>
              </div>
              <span className="font-mono font-bold text-[#483878] dark:text-slate-100">{upcoming}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D92D20]" />
                <span className="text-[#444444] dark:text-slate-200 font-semibold">متأخرة</span>
              </div>
              <span className="font-mono font-bold text-[#483878] dark:text-slate-100">{delayed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Center Card: توزيع الرحلات على مدار اليوم (Bar Chart) */}
      <div className="bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 pb-2 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
            <Tv className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#483878] dark:text-slate-100">توزيع الرحلات على مدار اليوم</h3>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                allowDecimals={false}
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#131C31',
                  borderColor: '#4A9FD8',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#F8FAFC',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              />
              <Bar dataKey="رحلات" fill="#4A9FD8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Right Card: التنبيهات التشغيلية (hidden on Main Dashboard where moved to top panel) */}
      {!hideAlertsPanel && (
        <div className="bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-2 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[#483878] dark:text-slate-100">التنبيهات التشغيلية</h3>
          </div>

          <div className="h-44 flex flex-col justify-center space-y-2 overflow-y-auto pr-1">
            {displayAlerts.length === 0 ? (
              <div className="text-center py-6 text-[#444444] dark:text-slate-300 text-xs">
                <CheckCircle2 className="w-7 h-7 text-[#22A06B] mx-auto mb-1.5 opacity-90" />
                <p className="font-bold text-[#483878] dark:text-slate-100">لا توجد تنبيهات تشغيلية حالياً</p>
                <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5">النظام يعمل بصورة طبيعية ومستقرة</p>
              </div>
            ) : (
              displayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 text-xs hover:bg-[#EEF7FC] dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-mono text-[#444444] dark:text-slate-300 shrink-0">{alert.timestamp}</span>
                  <span className="text-[#444444] dark:text-slate-200 font-medium truncate flex-1 text-right">
                    {alert.title}
                  </span>
                  {alert.severity === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-[#D92D20] shrink-0" />
                  ) : alert.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-[#E5A100] shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-[#2E7CF6] shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
