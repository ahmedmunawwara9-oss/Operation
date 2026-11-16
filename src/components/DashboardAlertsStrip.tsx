import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Check,
  CheckCircle2,
  Bell,
  ArrowLeft,
} from 'lucide-react';
import { OperationalAlert } from '../types';

interface DashboardAlertsStripProps {
  alerts: OperationalAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onOpenAllAlerts: () => void;
}

export const DashboardAlertsStrip: React.FC<DashboardAlertsStripProps> = ({
  alerts,
  onAcknowledgeAlert,
  onOpenAllAlerts,
}) => {
  const priorityAlerts = alerts
    .filter((a) => !a.acknowledged && (a.severity === 'critical' || a.severity === 'warning'))
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      return 0;
    });

  const topThree = priorityAlerts.slice(0, 3);

  return (
    <section
      aria-label="أحدث التنبيهات التشغيلية"
      className="w-full bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-3.5 sm:px-4 shadow-sm select-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#A9DDF5]/60 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
            <Bell className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-black text-[#483878] dark:text-slate-100">
            التنبيهات التشغيلية العاجلة
          </h2>
          {priorityAlerts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-[#D92D20]/10 text-[#D92D20] dark:text-red-300 border border-[#D92D20]/30">
              {priorityAlerts.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAllAlerts}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#483878] dark:text-[#A9DDF5] hover:text-[#2E7CF6] transition-colors cursor-pointer"
        >
          <span>عرض جميع التنبيهات</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {topThree.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#22A06B]/[0.07] dark:bg-[#22A06B]/15 border border-[#22A06B]/30 text-xs sm:text-sm font-bold text-[#22A06B]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>لا توجد تنبيهات حرجة أو تحذيرية معلقة حالياً</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {topThree.map((alert) => {
            const isCritical = alert.severity === 'critical';
            // Strictly Red (#D92D20) for critical, Yellow (#E5A100) for warning - NEVER orange
            const cardStyle = isCritical
              ? 'border-[#D92D20]/45 bg-[#D92D20]/[0.06] dark:bg-[#D92D20]/15'
              : 'border-[#E5A100]/50 bg-[#E5A100]/[0.08] dark:bg-[#E5A100]/15';
            const badgeStyle = isCritical
              ? 'bg-[#D92D20]/15 text-[#D92D20] dark:text-red-300 border-[#D92D20]/35'
              : 'bg-[#E5A100]/15 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/45';
            const IconComp = isCritical ? ShieldAlert : AlertTriangle;
            const iconColor = isCritical ? 'text-[#D92D20]' : 'text-[#E5A100]';

            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-colors ${cardStyle}`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <IconComp className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${badgeStyle}`}>
                        {isCritical ? 'حرج' : 'تحذير'}
                      </span>
                      <span className="text-[11px] font-mono text-[#444444] dark:text-slate-300">
                        {alert.timestamp}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-[#483878] dark:text-slate-100 leading-snug line-clamp-1">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-[#444444] dark:text-slate-300 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                      {alert.explanation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1 border-t border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-[#22A06B] hover:text-white text-[#483878] dark:text-slate-100 border border-[#A9DDF5] dark:border-slate-600 hover:border-[#22A06B] text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تم التعامل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
