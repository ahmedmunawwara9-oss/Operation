import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  Compass,
  Bus,
  Clock,
} from 'lucide-react';
import { Trip } from '../types';

interface OperationalAnalyticsProps {
  trips: Trip[];
}

export const OperationalAnalytics: React.FC<OperationalAnalyticsProps> = ({ trips }) => {
  // Trips per hour covering full 24h operational day (00:00 - 23:59)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourLabel = `${String(hour).padStart(2, '0')}:00`;
    let count = 0;
    trips.forEach((t) => {
      const depHour = parseInt(t.departureTime.split(':')[0], 10);
      if (depHour === hour) count++;
    });
    return {
      hour: hourLabel,
      رحلات: count,
    };
  });

  // Status distribution
  const statusCounts: Record<string, number> = {
    'جاري التنفيذ': 0,
    'مجدولة قادمة': 0,
    'مكتملة': 0,
    'تجاوز الموعد': 0,
    'تأخير مؤكد': 0,
    'تعارض': 0,
  };

  trips.forEach((t) => {
    if (t.status === 'in_progress_scheduled' || t.status === 'started_actual')
      statusCounts['جاري التنفيذ']++;
    else if (t.status === 'scheduled_upcoming') statusCounts['مجدولة قادمة']++;
    else if (t.status === 'completed_scheduled' || t.status === 'completed_actual')
      statusCounts['مكتملة']++;
    else if (t.status === 'needs_confirmation') statusCounts['تجاوز الموعد']++;
    else if (t.status === 'delayed_confirmed') statusCounts['تأخير مؤكد']++;
    else if (t.status === 'conflict') statusCounts['تعارض']++;
  });

  const pieData = Object.entries(statusCounts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const STATUS_COLORS: Record<string, string> = {
    'جاري التنفيذ': '#2E7CF6', // Blue (Info/Active)
    'مجدولة قادمة': '#4A9FD8', // Light Blue
    'مكتملة': '#22A06B',       // Green (On Time)
    'تجاوز الموعد': '#E5A100', // Yellow (Warning)
    'تأخير مؤكد': '#D92D20',   // Red (Critical - NO orange)
    'تعارض': '#D92D20',        // Red (Critical)
  };

  // Top Routes
  const routeCounts: Record<string, number> = {};
  trips.forEach((t) => {
    const routeKey = t.route || `${t.origin} ← ${t.destination}`;
    routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
  });

  const topRoutesData = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name: name.length > 25 ? name.substring(0, 25) + '...' : name,
      fullName: name,
      رحلات: count,
    }));

  // Top Buses
  const busTripCounts: Record<string, number> = {};
  trips.forEach((t) => {
    if (t.busId) {
      busTripCounts[t.busId] = (busTripCounts[t.busId] || 0) + 1;
    }
  });

  const topBuses = Object.entries(busTripCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([bus, count]) => ({ bus, رحلات: count }));

  return (
    <div className="w-full bg-white/95 dark:bg-[#131C31]/95 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-5 lg:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base lg:text-lg font-black text-[#483878] dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>التحليلات والمؤشرات التشغيلية</span>
              <span className="text-xs font-mono font-bold bg-[#22A06B]/10 text-[#22A06B] px-2.5 py-0.5 rounded-full border border-[#22A06B]/30">
                مباشر
              </span>
            </h2>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5">
              كثافة الرحلات وتوزيع الحالات التشغيلية والمسارات الأكثر طلباً
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1 */}
        <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#4A9FD8]" />
              كثافة الرحلات عبر ساعات اليوم
            </span>
            <span className="text-xs text-[#444444] dark:text-slate-300 font-mono">ساعات الذروة</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131C31',
                    borderColor: '#4A9FD8',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                />
                <Bar dataKey="رحلات" fill="#4A9FD8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-[#E8742A]" />
              توزيع الحالات التشغيلية للأسطول
            </span>
            <span className="text-xs text-[#444444] dark:text-slate-300 font-medium">إجمالي {trips.length} رحلة</span>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] || '#4A9FD8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131C31',
                    borderColor: '#4A9FD8',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-1.5 pr-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[entry.name] || '#4A9FD8' }}
                  />
                  <span className="text-[#444444] dark:text-slate-200">{entry.name}:</span>
                  <span className="font-mono font-bold text-[#483878] dark:text-slate-100">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Top Routes */}
        <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#4A9FD8]" />
              المسارات وخطوط السير الأكثر تشغيلاً
            </span>
          </div>
          <div className="space-y-2.5">
            {topRoutesData.map((route) => {
              const maxVal = topRoutesData[0]?.رحلات || 1;
              const pct = Math.round((route.رحلات / maxVal) * 100);
              return (
                <div key={route.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#444444] dark:text-slate-200 truncate">{route.fullName}</span>
                    <span className="font-mono text-[#483878] dark:text-[#A9DDF5] font-extrabold">{route.رحلات} رحلات</span>
                  </div>
                  <div className="h-2.5 bg-[#A9DDF5]/40 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-[#483878] to-[#4A9FD8] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Top Buses */}
        <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-[#E8742A]" />
              معدل استغلال الحافلات (عدد الرحلات)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {topBuses.map((b) => (
              <div
                key={b.bus}
                className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-[#A9DDF5] dark:border-slate-700 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="font-mono font-bold text-[#483878] dark:text-slate-100 text-xs">{b.bus}</p>
                  <p className="text-xs text-[#444444] dark:text-slate-300">حافلة أسطول</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#F5B13D]/15 text-[#483878] dark:text-[#F5B13D] border border-[#F5B13D]/40 flex items-center justify-center font-mono font-black text-sm">
                  {b.رحلات}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
