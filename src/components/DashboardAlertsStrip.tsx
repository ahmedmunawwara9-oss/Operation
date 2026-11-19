import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
  void onAcknowledgeAlert;

  const priorityAlerts = alerts
    .filter((a) => !a.acknowledged && (a.severity === 'critical' || a.severity === 'warning'))
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      return 0;
    });

  if (priorityAlerts.length === 0) {
    return null;
  }

  const topAlert = priorityAlerts[0];
  const summarySentence = topAlert.explanation
    ? `${topAlert.title}: ${topAlert.explanation}`
    : topAlert.title;

  return (
    <section
      aria-label="تنبيه تشغيلي"
      role="status"
      className="w-full rounded-2xl bg-[#FEF3C7] dark:bg-[#E5A100]/15 border border-[#E5A100]/60 dark:border-[#E5A100]/45 px-4 py-3 flex items-center justify-between gap-3 select-none"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <AlertTriangle
          className="w-5 h-5 text-[#B45309] dark:text-[#F5B13D] shrink-0"
          aria-hidden="true"
        />
        <p
          className="text-[13px] sm:text-[14px] font-bold text-[#78350F] dark:text-[#FDE68A] truncate"
          title={summarySentence}
        >
          {summarySentence}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenAllAlerts}
        className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-[#D97706]/40 dark:border-[#E5A100]/50 text-[#92400E] dark:text-[#FDE68A] text-[13px] font-bold transition-colors cursor-pointer whitespace-nowrap"
      >
        عرض التفاصيل
      </button>
    </section>
  );
};
