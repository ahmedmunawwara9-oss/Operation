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
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Trip } from '../types';
import { BusStatusDonutChart } from './BusStatusDonutChart';

interface OperationalAnalyticsProps {
  trips: Trip[];
}

interface AnalyticsErrorBoundaryState {
  hasError: boolean;
}

class AnalyticsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AnalyticsErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AnalyticsErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('OperationalAnalytics ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="w-full bg-white/95 dark:bg-[#131C31]/95 rounded-2xl border border-[#D92D20]/35 p-6 shadow-sm flex flex-col items-center justify-center text-center gap-3"
        >
          <AlertTriangle className="w-7 h-7 text-[#D92D20]" aria-hidden="true" />
          <p className="text-sm sm:text-base font-bold text-[#483878] dark:text-slate-100">
            تعذّر عرض التحليلات حاليًا
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#483878] hover:bg-[#3a2c63] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const OperationalAnalyticsContent: React.FC<OperationalAnalyticsProps> = ({ trips }) => {
  const safeTrips = Array.isArray(trips) ? trips.filter(Boolean) : [];

  // Trips per hour covering full 24h operational day (00:00 - 23:59)
  let totalValidHourlyTrips = 0;
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourLabel = `${String(hour).padStart(2, '0')}:00`;
    let count = 0;
    safeTrips.forEach((t) => {
      if (typeof t?.departureTime !== 'string' || !t.departureTime.includes(':')) return;
      const depHour = parseInt(t.departureTime.split(':')[0], 10);
      if (Number.isFinite(depHour) && depHour === hour) {
        count++;
        totalValidHourlyTrips++;
      }
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

  safeTrips.forEach((t) => {
    const status = t?.status;
    if (status === 'in_progress_scheduled' || status === 'started_actual')
      statusCounts['جاري التنفيذ']++;
    else if (status === 'scheduled_upcoming') statusCounts['مجدولة قادمة']++;
    else if (status === 'completed_scheduled' || status === 'completed_actual')
      statusCounts['مكتملة']++;
    else if (status === 'needs_confirmation') statusCounts['تجاوز الموعد']++;
    else if (status === 'delayed_confirmed') statusCounts['تأخير مؤكد']++;
    else if (status === 'conflict') statusCounts['تعارض']++;
  });

  const pieData = Object.entries(statusCounts)
    .filter(([_, value]) => Number.isFinite(value) && value > 0)
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
  safeTrips.forEach((t) => {
    const origin = typeof t?.origin === 'string' && t.origin.trim() ? t.origin.trim() : 'غير محدد';
    const destination =
      typeof t?.destination === 'string' && t.destination.trim() ? t.destination.trim() : 'غير محدد';
    const routeKey =
      typeof t?.route === 'string' && t.route.trim() ? t.route.trim() : `${origin} ← ${destination}`;
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
  safeTrips.forEach((t) => {
    if (typeof t?.busId === 'string' && t.busId.trim()) {
      const busId = t.busId.trim();
      busTripCounts[busId] = (busTripCounts[busId] || 0) + 1;
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

      {safeTrips.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-[#444444] dark:text-slate-300">
            لا توجد بيانات كافية للتحليل حاليًا
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Featured D3 Donut Chart: Bus Status Distribution */}
          <div className="lg:col-span-2">
            <BusStatusDonutChart trips={safeTrips} />
          </div>

          {/* Chart 1 */}
          <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4A9FD8]" />
                كثافة الرحلات عبر ساعات اليوم
              </span>
              <span className="text-xs text-[#444444] dark:text-slate-300 font-mono">ساعات الذروة</span>
            </div>
            {totalValidHourlyTrips === 0 ? (
              <div className="h-64 min-h-[16rem] w-full flex items-center justify-center">
                <p className="text-sm font-semibold text-[#444444] dark:text-slate-300">
                  لا توجد بيانات كافية للتحليل حاليًا
                </p>
              </div>
            ) : (
              <div className="h-64 min-h-[16rem] w-full min-w-0">
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
            )}
          </div>

          {/* Chart 2 */}
          <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-[#E8742A]" />
                توزيع الحالات التشغيلية للأسطول
              </span>
              <span className="text-xs text-[#444444] dark:text-slate-300 font-medium">
                إجمالي {safeTrips.length} رحلة
              </span>
            </div>
            {pieData.length === 0 ? (
              <div className="h-64 min-h-[16rem] w-full flex items-center justify-center">
                <p className="text-sm font-semibold text-[#444444] dark:text-slate-300">
                  لا توجد بيانات كافية للتحليل حاليًا
                </p>
              </div>
            ) : (
              <div className="h-64 min-h-[16rem] w-full flex items-center justify-center min-w-0">
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
                      paddingAngle={pieData.length > 1 ? 3 : 0}
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

                <div className="space-y-1.5 pr-2 shrink-0">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[entry.name] || '#4A9FD8' }}
                      />
                      <span className="text-[#444444] dark:text-slate-200">{entry.name}:</span>
                      <span className="font-mono font-bold text-[#483878] dark:text-slate-100">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart 3: Top Routes */}
          <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#4A9FD8]" />
                المسارات وخطوط السير الأكثر تشغيلاً
              </span>
            </div>
            {topRoutesData.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-[#444444] dark:text-slate-300">
                  لا توجد بيانات كافية للتحليل حاليًا
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topRoutesData.map((route) => {
                  const maxVal = Math.max(1, topRoutesData[0]?.رحلات || 1);
                  const rawPct = Math.round((route.رحلات / maxVal) * 100);
                  const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0;
                  return (
                    <div key={route.fullName} className="space-y-1">
                      <div className="flex justify-between text-xs gap-2">
                        <span className="font-bold text-[#444444] dark:text-slate-200 truncate">
                          {route.fullName}
                        </span>
                        <span className="font-mono text-[#483878] dark:text-[#A9DDF5] font-extrabold shrink-0">
                          {route.رحلات} رحلات
                        </span>
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
            )}
          </div>

          {/* Chart 4: Top Buses */}
          <div className="bg-[#F7FBFE] dark:bg-slate-800/70 p-4 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#483878] dark:text-slate-100 flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-[#E8742A]" />
                معدل استغلال الحافلات (عدد الرحلات)
              </span>
            </div>
            {topBuses.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-[#444444] dark:text-slate-300">
                  لا توجد بيانات كافية للتحليل حاليًا
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {topBuses.map((b) => (
                  <div
                    key={b.bus}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-[#A9DDF5] dark:border-slate-700 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <p className="font-mono font-bold text-[#483878] dark:text-slate-100 text-xs">
                        {b.bus}
                      </p>
                      <p className="text-xs text-[#444444] dark:text-slate-300">حافلة أسطول</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#F5B13D]/15 text-[#483878] dark:text-[#F5B13D] border border-[#F5B13D]/40 flex items-center justify-center font-mono font-black text-sm">
                      {b.رحلات}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const OperationalAnalytics: React.FC<OperationalAnalyticsProps> = ({ trips }) => {
  return (
    <AnalyticsErrorBoundary>
      <OperationalAnalyticsContent trips={trips} />
    </AnalyticsErrorBoundary>
  );
};
