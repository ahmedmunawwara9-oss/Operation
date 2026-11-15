import React, { useState, useMemo } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Check,
  History,
  UserCheck,
  Clock,
} from 'lucide-react';
import { OperationalAlert, AlertSeverity } from '../types';
import { normalizeToWesternDigits } from '../services/dateTimeUtils';

export interface HandledAlertRecord {
  id: string;
  alertIds: string[];
  title: string;
  severity: AlertSeverity;
  count: number;
  handledBy: string;
  handledAt: string;
  explanation: string;
}

interface GroupedAlertItem {
  groupKey: string;
  alertIds: string[];
  representative: OperationalAlert;
  count: number;
  severity: AlertSeverity;
}

interface OperationalAlertsPanelProps {
  alerts: OperationalAlert[];
  handledLog: HandledAlertRecord[];
  onHandleAlertGroup: (alertIds: string[], summary: { title: string; severity: AlertSeverity; count: number; explanation: string }) => void;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function getAlertGroupingKey(alert: OperationalAlert): string {
  const basePattern = alert.title.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  const entityKey = alert.tripNumber || alert.busId || alert.driverName || '';
  return `${alert.type}::${alert.severity}::${basePattern}::${entityKey}`;
}

export const OperationalAlertsPanel: React.FC<OperationalAlertsPanelProps> = ({
  alerts,
  handledLog,
  onHandleAlertGroup,
}) => {
  const [viewMode, setViewMode] = useState<'active' | 'handled'>('active');
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');

  const unacknowledged = useMemo(
    () => alerts.filter((a) => !a.acknowledged),
    [alerts]
  );

  const groupedActiveAlerts = useMemo(() => {
    const groupsMap = new Map<string, GroupedAlertItem>();

    for (const alert of unacknowledged) {
      const key = getAlertGroupingKey(alert);
      const existing = groupsMap.get(key);

      let embeddedCount = 1;
      if (alert.type === 'duplicate') {
        const match = alert.explanation.match(/يوجد\s+(\d+)\s+رحلات/);
        if (match && parseInt(match[1], 10) > 1) {
          embeddedCount = parseInt(match[1], 10);
        }
      }

      if (existing) {
        existing.alertIds.push(alert.id);
        existing.count += embeddedCount;
      } else {
        groupsMap.set(key, {
          groupKey: key,
          alertIds: [alert.id],
          representative: alert,
          count: embeddedCount,
          severity: alert.severity,
        });
      }
    }

    return Array.from(groupsMap.values()).sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    );
  }, [unacknowledged]);

  const filteredGroups = useMemo(() => {
    if (severityFilter === 'all') return groupedActiveAlerts;
    return groupedActiveAlerts.filter((g) => g.severity === severityFilter);
  }, [groupedActiveAlerts, severityFilter]);

  const criticalCount = groupedActiveAlerts.filter((g) => g.severity === 'critical').length;
  const warningCount = groupedActiveAlerts.filter((g) => g.severity === 'warning').length;
  const infoCount = groupedActiveAlerts.filter((g) => g.severity === 'info').length;

  return (
    <div className="bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm select-none">
      {/* Top Panel Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#A9DDF5]/70 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#483878]/10 dark:bg-[#483878]/40 text-[#483878] dark:text-[#A9DDF5] flex items-center justify-center shadow-sm shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-[#483878] dark:text-white">
                التنبيهات التشغيلية الفورية
              </h2>
              {criticalCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#D92D20] text-white shadow-sm">
                  {criticalCount} حرجة
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E5A100]/15 text-[#9A6B00] dark:text-amber-300 border border-[#E5A100]/40">
                  {warningCount} تحذير
                </span>
              )}
              {infoCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2E7CF6]/12 text-[#2E7CF6] dark:text-blue-300 border border-[#2E7CF6]/35">
                  {infoCount} معلومة
                </span>
              )}
            </div>
            <p className="text-xs text-[#444444] dark:text-slate-300 font-medium mt-0.5">
              مرتبة بالأولوية (الحرجة أولاً) مع تجميع التنبيهات المتكررة وتسجيل إجراءات المعالجة
            </p>
          </div>
        </div>

        {/* View Switcher & Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active vs Handled Log Toggle */}
          <div className="flex items-center gap-1 bg-[#F7FBFE] dark:bg-slate-800 p-1 rounded-xl border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'active'
                  ? 'bg-[#E8742A] text-white shadow-sm'
                  : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>التنبيهات النشطة ({groupedActiveAlerts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('handled')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'handled'
                  ? 'bg-[#483878] text-white shadow-sm'
                  : 'text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل المعالَجة ({handledLog.length})</span>
            </button>
          </div>

          {/* Severity Filters (Strictly Status Colors) */}
          {viewMode === 'active' && (
            <div className="flex items-center gap-1 bg-[#F7FBFE] dark:bg-slate-800 p-1 rounded-xl border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSeverityFilter('all')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  severityFilter === 'all'
                    ? 'bg-[#483878] text-white'
                    : 'text-[#444444] dark:text-slate-300 hover:bg-[#A9DDF5]/25 dark:hover:bg-slate-700'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('critical')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  severityFilter === 'critical'
                    ? 'bg-[#D92D20] text-white'
                    : 'text-[#D92D20] dark:text-red-400 hover:bg-[#D92D20]/10'
                }`}
              >
                حرجة
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('warning')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  severityFilter === 'warning'
                    ? 'bg-[#E5A100] text-white'
                    : 'text-[#9A6B00] dark:text-amber-400 hover:bg-[#E5A100]/10'
                }`}
              >
                تحذير
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('info')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  severityFilter === 'info'
                    ? 'bg-[#2E7CF6] text-white'
                    : 'text-[#2E7CF6] dark:text-blue-400 hover:bg-[#2E7CF6]/10'
                }`}
              >
                معلومة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content List */}
      <div className="mt-3 max-h-[250px] overflow-y-auto space-y-2.5 pr-1">
        {viewMode === 'active' ? (
          filteredGroups.length === 0 ? (
            <div className="py-6 text-center bg-[#F7FBFE] dark:bg-slate-800/60 rounded-xl border border-[#22A06B]/30 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#22A06B] dark:text-emerald-400 mb-1.5" />
              <p className="text-xs sm:text-sm font-black text-[#483878] dark:text-white">
                لا توجد تنبيهات تشغيلية معلقة حالياً
              </p>
              <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5">
                العمليات والرحلات تسير بصورة مستقرة ومنضبطة
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const alert = group.representative;

              let containerStyle = 'bg-[#2E7CF6]/[0.06] dark:bg-[#2E7CF6]/15 border-[#2E7CF6]/35';
              let badgeStyle = 'bg-[#2E7CF6] text-white border-[#2E7CF6]';
              let badgeLabel = 'معلومة';
              let IconComp = Info;
              let iconColor = 'text-[#2E7CF6] dark:text-blue-400';

              if (group.severity === 'critical') {
                containerStyle = 'bg-[#D92D20]/[0.06] dark:bg-[#D92D20]/15 border-[#D92D20]/40';
                badgeStyle = 'bg-[#D92D20] text-white border-[#D92D20]';
                badgeLabel = 'حرجة';
                IconComp = ShieldAlert;
                iconColor = 'text-[#D92D20] dark:text-red-400';
              } else if (group.severity === 'warning') {
                containerStyle = 'bg-[#E5A100]/[0.08] dark:bg-[#E5A100]/15 border-[#E5A100]/45';
                badgeStyle = 'bg-[#E5A100] text-white border-[#E5A100]';
                badgeLabel = 'تحذير';
                IconComp = AlertTriangle;
                iconColor = 'text-[#E5A100] dark:text-amber-400';
              }

              return (
                <div
                  key={group.groupKey}
                  className={`p-3 rounded-xl border ${containerStyle} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-sm`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <IconComp className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeStyle}`}
                        >
                          {badgeLabel}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-[#483878] dark:text-white">
                          {alert.title}
                        </span>
                        {group.count > 1 && (
                          <span className="px-2 py-0.5 rounded-md bg-[#483878] text-white font-mono text-xs font-black">
                            ×{group.count}
                          </span>
                        )}
                        <span className="text-xs font-mono font-semibold text-[#444444] dark:text-slate-300">
                          {normalizeToWesternDigits(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#444444] dark:text-slate-200 font-medium mt-1 leading-relaxed">
                        {alert.explanation}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onHandleAlertGroup(group.alertIds, {
                        title: alert.title,
                        severity: group.severity,
                        count: group.count,
                        explanation: alert.explanation,
                      })
                    }
                    className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#22A06B] text-[#483878] dark:text-slate-100 hover:text-white border border-[#A9DDF5] dark:border-slate-700 hover:border-[#22A06B] text-xs sm:text-sm font-black transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>تم التعامل</span>
                  </button>
                </div>
              );
            })
          )
        ) : handledLog.length === 0 ? (
          <div className="py-6 text-center bg-[#F7FBFE] dark:bg-slate-800/60 rounded-xl border border-[#A9DDF5] dark:border-slate-700">
            <History className="w-7 h-7 text-[#4A9FD8] mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-bold text-[#483878] dark:text-white">
              سجل المعالَجة فارغ حالياً
            </p>
            <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5">
              سيظهر هنا أي تنبيه يتم الضغط على زر «تم التعامل» له مع اسم المستخدم ووقت المعالجة
            </p>
          </div>
        ) : (
          handledLog.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#22A06B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-[#22A06B] dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-[#483878] dark:text-white">
                      {item.title}
                    </span>
                    {item.count > 1 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#A9DDF5]/40 dark:bg-slate-700 text-[#483878] dark:text-[#A9DDF5] font-mono text-xs font-black">
                        ×{item.count}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#22A06B]/10 dark:bg-emerald-950/50 text-[#22A06B] dark:text-emerald-400 border border-[#22A06B]/30">
                      تم التعامل
                    </span>
                  </div>
                  <p className="text-xs text-[#444444] dark:text-slate-300 mt-0.5 truncate">{item.explanation}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#444444] dark:text-slate-300 shrink-0 bg-white dark:bg-[#131C31] px-3 py-1.5 rounded-xl border border-[#A9DDF5] dark:border-slate-700">
                <span className="flex items-center gap-1 text-[#483878] dark:text-slate-100">
                  <UserCheck className="w-3.5 h-3.5 text-[#4A9FD8]" />
                  <span>{item.handledBy}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[#444444] dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-[#4A9FD8]" />
                  <span>{item.handledAt}</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
