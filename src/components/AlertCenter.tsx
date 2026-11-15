import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Check,
  Bell,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { OperationalAlert, AlertSeverity } from '../types';

interface AlertCenterProps {
  alerts: OperationalAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onAcknowledgeAll: () => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  onAcknowledgeAlert,
  onAcknowledgeAll,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const activeAlerts = alerts.filter((a) => (showAcknowledged ? true : !a.acknowledged));

  const filteredAlerts = activeAlerts.filter((a) => {
    if (severityFilter === 'all') return true;
    return a.severity === severityFilter;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length;

  return (
    <div className="w-full bg-white/95 dark:bg-[#131C31]/95 rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-5 lg:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 pb-4 border-b border-[#A9DDF5]/60 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base lg:text-lg font-black text-[#483878] dark:text-slate-100 tracking-tight">
                مركز التنبيهات والتعارضات التشغيلية
              </h2>
              {criticalCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D92D20] text-white animate-bounce">
                  {criticalCount} حرج
                </span>
              )}
            </div>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5 font-medium">
              كشف التداخلات اللوجستية وتأخيرات الميدان وأوقات الانطلاق القريبة
            </p>
          </div>
        </div>

        {/* Severity Tabs and Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                severityFilter === 'all'
                  ? 'bg-[#E8742A] text-white shadow-sm'
                  : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
              }`}
            >
              الكل ({activeAlerts.length})
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                severityFilter === 'critical'
                  ? 'bg-[#D92D20] text-white shadow-sm'
                  : 'text-[#D92D20] hover:bg-[#D92D20]/10'
              }`}
            >
              حرج ({criticalCount})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                severityFilter === 'warning'
                  ? 'bg-[#E5A100] text-white shadow-sm'
                  : 'text-[#9A6B00] dark:text-[#F5B13D] hover:bg-[#E5A100]/12'
              }`}
            >
              تحذير ({warningCount})
            </button>
          </div>

          {activeAlerts.length > 0 && (
            <button
              onClick={onAcknowledgeAll}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#483878] hover:bg-[#3a2c63] text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تأكيد قراءة الكل</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 bg-[#F7FBFE] dark:bg-slate-800/60 rounded-2xl border border-dashed border-[#A9DDF5] dark:border-slate-700">
            <CheckCircle className="w-9 h-9 text-[#22A06B] mx-auto mb-2 opacity-90" />
            <p className="text-sm font-bold text-[#483878] dark:text-slate-100">
              لا توجد تنبيهات تشغيلية معلقة
            </p>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5">
              جميع الجداول والحافلات تعمل وفق الخطة المعتمدة دون تعارضات نشطة
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            // Strictly Status Colors: Red #D92D20 (critical), Yellow #E5A100 (warning), Blue #2E7CF6 (info)
            let borderClass = 'border-[#2E7CF6]/35 bg-[#2E7CF6]/[0.06] dark:bg-[#2E7CF6]/12 text-[#444444] dark:text-slate-200';
            let iconColor = 'text-[#2E7CF6]';
            let IconComp = Info;
            let badgeBg = 'bg-[#2E7CF6]/12 text-[#2E7CF6] dark:text-[#60A5FA] border-[#2E7CF6]/35';

            if (alert.severity === 'critical') {
              borderClass = 'border-[#D92D20]/40 bg-[#D92D20]/[0.06] dark:bg-[#D92D20]/12 text-[#444444] dark:text-slate-200';
              iconColor = 'text-[#D92D20]';
              IconComp = ShieldAlert;
              badgeBg = 'bg-[#D92D20]/12 text-[#D92D20] dark:text-red-300 border-[#D92D20]/35';
            } else if (alert.severity === 'warning') {
              borderClass = 'border-[#E5A100]/45 bg-[#E5A100]/[0.08] dark:bg-[#E5A100]/12 text-[#444444] dark:text-slate-200';
              iconColor = 'text-[#E5A100]';
              IconComp = AlertTriangle;
              badgeBg = 'bg-[#E5A100]/15 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/45';
            }

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all ${borderClass} relative`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <IconComp className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs sm:text-sm font-black text-[#483878] dark:text-slate-100">
                          {alert.title}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${badgeBg}`}>
                          {alert.severity === 'critical'
                            ? 'حرج'
                            : alert.severity === 'warning'
                            ? 'تحذير'
                            : 'معلومة'}
                        </span>
                        {alert.tripNumber && (
                          <span className="font-mono text-xs font-bold text-[#483878] dark:text-[#A9DDF5]">
                            [{alert.tripNumber}]
                          </span>
                        )}
                        <span className="text-xs text-[#444444] dark:text-slate-300 font-mono">
                          {alert.timestamp}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-[#444444] dark:text-slate-200 mb-2 leading-relaxed">
                        {alert.explanation}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-[#444444] dark:text-slate-200 bg-white/90 dark:bg-slate-900/70 px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700">
                        <span className="font-bold text-[#483878] dark:text-[#A9DDF5]">الإجراء الموصى به:</span>
                        <span>{alert.recommendedAction}</span>
                      </div>
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="shrink-0 p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#22A06B]/10 text-[#444444] dark:text-slate-200 hover:text-[#22A06B] border border-[#A9DDF5] dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
                      title="تأكيد الاطلاع وتجاهل التنبيه"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
