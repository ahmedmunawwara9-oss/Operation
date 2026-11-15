import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Trip } from '../types';
import { ScheduleKPIs, calculateFleetKPIs, getStatusMeta } from './scheduleEngine';

export interface ExportReportOptions {
  kpis?: ScheduleKPIs;
  companyName?: string;
  exportedBy?: string;
  filterLabel?: string;
  currentTime?: Date;
}

function formatFileTimestamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}_${hh}-${mm}`;
}

function formatReadableDateTime(date: Date): string {
  try {
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function escapeHtml(value: unknown): string {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusBadgeColors(status: Trip['status']): { bg: string; text: string; border: string } {
  switch (status) {
    case 'in_progress_scheduled':
      return { bg: '#EBF3FE', text: '#2E7CF6', border: '#93C5FD' };
    case 'started_actual':
    case 'completed_actual':
    case 'completed_scheduled':
      return { bg: '#E9F7F0', text: '#22A06B', border: '#86EFAC' };
    case 'scheduled_upcoming':
      return { bg: '#EEF7FC', text: '#483878', border: '#A9DDF5' };
    case 'delayed_confirmed':
    case 'conflict':
      return { bg: '#FDECEB', text: '#D92D20', border: '#FCA5A5' };
    case 'needs_confirmation':
      return { bg: '#FDF6E2', text: '#9A6B00', border: '#FCD34D' };
    case 'cancelled':
    default:
      return { bg: '#F1F5F9', text: '#444444', border: '#CBD5E1' };
  }
}

/**
 * Exports the current trips list and operational summary to an Arabic RTL Excel (.xlsx) workbook
 */
export function exportTripsToExcel(trips: Trip[], options: ExportReportOptions = {}): void {
  if (!trips || trips.length === 0) {
    throw new Error('لا توجد رحلات حالية لتصديرها.');
  }

  const now = options.currentTime || new Date();
  const kpis = options.kpis || calculateFleetKPIs(trips);
  const companyName = options.companyName || 'درة المنورة لنقل الحجاج والمعتمرين';
  const exportedBy = options.exportedBy || 'مكتب التشغيل والعمليات';

  // Sheet 1: Trips List
  const tripRows = trips.map((t, index) => {
    const statusLabel = getStatusMeta(t.status, 'ar').label;
    const conflictsText =
      t.conflicts && t.conflicts.length > 0
        ? t.conflicts.map((c) => c.description).join(' | ')
        : 'لا يوجد';

    return {
      '#': index + 1,
      'رقم الرحلة': t.tripNumber || '',
      'رقم الحافلة': t.busId || '',
      'رقم اللوحة': t.plateNumber || '-',
      'اسم السائق': t.driverName || '',
      'هاتف السائق': t.driverPhone || '-',
      'نقطة الانطلاق': t.origin || '',
      'الوجهة': t.destination || '',
      'المسار': t.route || `${t.origin} ← ${t.destination}`,
      'تاريخ الرحلة': t.tripDate || '',
      'وقت الانطلاق': t.departureTime || '',
      'وقت الوصول': t.arrivalTime || '',
      'المدة (دقيقة)': t.durationMinutes || 0,
      'عدد الركاب': t.passengerCount ?? 0,
      'الحالة التشغيلية': statusLabel,
      'نسبة الإنجاز %': `${Math.round((t.progress || 0) * 100)}%`,
      'الانطلاق الفعلي': t.actualDepartureTime || '-',
      'الوصول الفعلي': t.actualArrivalTime || '-',
      'التأخير (دقيقة)': t.delayMinutes ?? 0,
      'التعارضات': conflictsText,
      'ملاحظات': t.notes || '',
    };
  });

  const tripsSheet = XLSX.utils.json_to_sheet(tripRows);
  tripsSheet['!views'] = [{ rightToLeft: true }];
  tripsSheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 14 }, // رقم الرحلة
    { wch: 13 }, // رقم الحافلة
    { wch: 13 }, // رقم اللوحة
    { wch: 24 }, // اسم السائق
    { wch: 15 }, // هاتف السائق
    { wch: 22 }, // نقطة الانطلاق
    { wch: 22 }, // الوجهة
    { wch: 28 }, // المسار
    { wch: 13 }, // تاريخ الرحلة
    { wch: 12 }, // وقت الانطلاق
    { wch: 12 }, // وقت الوصول
    { wch: 13 }, // المدة
    { wch: 12 }, // الركاب
    { wch: 22 }, // الحالة التشغيلية
    { wch: 13 }, // نسبة الإنجاز
    { wch: 14 }, // الانطلاق الفعلي
    { wch: 14 }, // الوصول الفعلي
    { wch: 14 }, // التأخير
    { wch: 30 }, // التعارضات
    { wch: 26 }, // ملاحظات
  ];

  // Sheet 2: Executive Operations Summary
  const summaryRows = [
    { 'البند': 'اسم الشركة', 'القيمة': companyName },
    { 'البند': 'إدارة التشغيل', 'القيمة': 'مكتب التشغيل والعمليات - الأستاذ عبد الحميد سالمة' },
    { 'البند': 'تاريخ ووقت التصدير', 'القيمة': formatReadableDateTime(now) },
    { 'البند': 'المُصدِر', 'القيمة': exportedBy },
    { 'البند': 'نطاق التقرير', 'القيمة': options.filterLabel || 'جميع الرحلات الحالية' },
    { 'البند': '', 'القيمة': '' },
    { 'البند': 'إجمالي الرحلات', 'القيمة': kpis.totalTrips },
    { 'البند': 'الحافلات على الطريق (قيد التنفيذ)', 'القيمة': kpis.inProgressTrips },
    { 'البند': 'الرحلات القادمة', 'القيمة': kpis.upcomingTrips },
    { 'البند': 'الرحلات المكتملة', 'القيمة': kpis.completedTrips },
    { 'البند': 'الرحلات المتأخرة / تجاوزت الموعد', 'القيمة': kpis.delayedConfirmedTrips + kpis.unconfirmedExceededTrips },
    { 'البند': 'تعارضات الجدول', 'القيمة': kpis.conflictCount },
    { 'البند': 'إجمالي الحافلات المشاركة', 'القيمة': kpis.uniqueBusesCount },
    { 'البند': 'إجمالي السائقين', 'القيمة': kpis.uniqueDriversCount },
    { 'البند': 'إجمالي الركاب', 'القيمة': kpis.totalPassengers },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!views'] = [{ rightToLeft: true }];
  summarySheet['!cols'] = [{ wch: 34 }, { wch: 46 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, tripsSheet, 'قائمة الرحلات');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص التشغيل');

  const filename = `تقرير_الرحلات_DMTC_${formatFileTimestamp(now)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

async function fetchLogoAsDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}assets/aistudio/logo_df9a0408.jpeg`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Logo read failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Exports the current trips list as a styled, paginated Arabic RTL Landscape A4 PDF
 * using an isolated iframe so Tailwind CSS v4 oklch() stylesheets do not interfere with html2canvas.
 */
export async function exportTripsToPDF(
  trips: Trip[],
  options: ExportReportOptions = {}
): Promise<void> {
  if (!trips || trips.length === 0) {
    throw new Error('لا توجد رحلات حالية لتصديرها.');
  }

  const now = options.currentTime || new Date();
  const kpis = options.kpis || calculateFleetKPIs(trips);
  const companyName = options.companyName || 'درة المنورة لنقل الحجاج والمعتمرين';
  const exportedBy = options.exportedBy || 'مكتب التشغيل والعمليات';
  const filterLabel = options.filterLabel || 'جميع الرحلات الحالية';
  const readableDate = formatReadableDateTime(now);
  const logoDataUrl = await fetchLogoAsDataUrl();

  // Split trips into pages: 12 rows on page 1 (which includes KPI summary), 15 rows on subsequent pages
  const pages: Trip[][] = [];
  if (trips.length <= 12) {
    pages.push(trips);
  } else {
    pages.push(trips.slice(0, 12));
    for (let i = 12; i < trips.length; i += 15) {
      pages.push(trips.slice(i, i + 15));
    }
  }

  const totalPages = pages.length;

  const buildPageHtml = (pageTrips: Trip[], pageIndex: number, startRowNumber: number): string => {
    const isFirstPage = pageIndex === 0;
    const rowsHtml = pageTrips
      .map((t, idx) => {
        const rowNum = startRowNumber + idx + 1;
        const statusMeta = getStatusMeta(t.status, 'ar');
        const badge = getStatusBadgeColors(t.status);
        const progressPct = Math.round((t.progress || 0) * 100);
        const conflictsStr =
          t.conflicts && t.conflicts.length > 0
            ? t.conflicts.map((c) => c.description).join('، ')
            : '';
        const notesOrConflict = conflictsStr || t.notes || '—';

        return `
          <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F7FBFE'};">
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;font-family:'Cairo',sans-serif;font-weight:700;color:#444444;">${rowNum}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;font-family:'Cairo',sans-serif;font-weight:800;color:#483878;">${escapeHtml(t.tripNumber)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;font-family:'Cairo',sans-serif;font-weight:700;color:#4A9FD8;">
              ${escapeHtml(t.busId)}
              ${t.plateNumber ? `<div style="font-size:9px;color:#444444;font-weight:600;">${escapeHtml(t.plateNumber)}</div>` : ''}
            </td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;font-weight:700;color:#444444;">${escapeHtml(t.driverName)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;color:#444444;">${escapeHtml(t.origin)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;color:#483878;font-weight:700;">${escapeHtml(t.destination)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;font-family:'Cairo',sans-serif;color:#444444;">${escapeHtml(t.tripDate)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;font-family:'Cairo',sans-serif;font-weight:800;color:#483878;">${escapeHtml(t.departureTime)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;font-family:'Cairo',sans-serif;font-weight:800;color:#483878;">${escapeHtml(t.arrivalTime)}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;font-family:'Cairo',sans-serif;color:#22A06B;font-weight:700;">${progressPct}%</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;font-family:'Cairo',sans-serif;font-weight:700;color:#444444;">${t.passengerCount ?? 0}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;text-align:center;">
              <span style="display:inline-block;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:800;background:${badge.bg};color:${badge.text};border:1px solid ${badge.border};white-space:nowrap;">
                ${escapeHtml(statusMeta.label)}
              </span>
            </td>
            <td style="padding:7px 6px;border-bottom:1px solid #A9DDF5;font-size:10px;color:${conflictsStr ? '#D92D20' : '#444444'};font-weight:${conflictsStr ? '700' : '500'};max-width:140px;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(notesOrConflict)}
            </td>
          </tr>
        `;
      })
      .join('');

    const kpiStripHtml = isFirstPage
      ? `
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px;">
          <div style="background:#F7FBFE;border:1px solid #A9DDF5;border-radius:12px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;color:#483878;">إجمالي الرحلات</div>
            <div style="font-size:20px;font-weight:900;color:#E8742A;font-family:'Cairo',sans-serif;margin-top:2px;">${kpis.totalTrips}</div>
          </div>
          <div style="background:#F7FBFE;border:1px solid #A9DDF5;border-radius:12px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;color:#483878;">على الطريق الآن</div>
            <div style="font-size:20px;font-weight:900;color:#4A9FD8;font-family:'Cairo',sans-serif;margin-top:2px;">${kpis.inProgressTrips}</div>
          </div>
          <div style="background:#F7FBFE;border:1px solid #A9DDF5;border-radius:12px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;color:#483878;">الرحلات القادمة</div>
            <div style="font-size:20px;font-weight:900;color:#483878;font-family:'Cairo',sans-serif;margin-top:2px;">${kpis.upcomingTrips}</div>
          </div>
          <div style="background:#E9F7F0;border:1px solid #86EFAC;border-radius:12px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;color:#22A06B;">الرحلات المكتملة</div>
            <div style="font-size:20px;font-weight:900;color:#22A06B;font-family:'Cairo',sans-serif;margin-top:2px;">${kpis.completedTrips}</div>
          </div>
          <div style="background:#FDECEB;border:1px solid #FCA5A5;border-radius:12px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;color:#D92D20;">متأخرة / تعارض</div>
            <div style="font-size:20px;font-weight:900;color:#D92D20;font-family:'Cairo',sans-serif;margin-top:2px;">${kpis.delayedConfirmedTrips + kpis.unconfirmedExceededTrips + kpis.conflictCount}</div>
          </div>
          <div style="background:#F7FBFE;border:1px solid #A9DDF5;border-radius:12px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;color:#483878;">الحافلات / الركاب</div>
            <div style="font-size:16px;font-weight:900;color:#483878;font-family:'Cairo',sans-serif;margin-top:4px;">${kpis.uniqueBusesCount} / ${kpis.totalPassengers}</div>
          </div>
        </div>
      `
      : '';

    return `
      <div class="pdf-page" style="width:1123px;height:794px;background:#FFFFFF;position:relative;box-sizing:border-box;padding:22px 26px 20px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;page-break-after:always;">
        <!-- Top Brand Ribbon -->
        <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#483878 0%,#4A9FD8 35%,#F5B13D 70%,#E8742A 100%);"></div>

        <div>
          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:14px;border-bottom:2px solid #A9DDF5;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${
                logoDataUrl
                  ? `<div style="width:54px;height:54px;border-radius:12px;border:1px solid #A9DDF5;padding:4px;background:#FFFFFF;display:flex;align-items:center;justify-content:center;"><img src="${logoDataUrl}" style="width:100%;height:100%;object-fit:contain;" /></div>`
                  : ''
              }
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:19px;font-weight:900;color:#483878;">${escapeHtml(companyName)}</span>
                  <span style="background:#483878;color:#FFFFFF;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;">DMTC</span>
                </div>
                <div style="font-size:12px;font-weight:800;color:#E8742A;margin-top:2px;">
                  تقرير قائمة الرحلات والتشغيل اليومي | مكتب التشغيل والعمليات
                </div>
              </div>
            </div>

            <div style="text-align:left;background:#F7FBFE;border:1px solid #A9DDF5;border-radius:12px;padding:8px 14px;font-size:11px;line-height:1.6;">
              <div><strong style="color:#483878;">مدير التشغيل:</strong> <span style="color:#444444;font-weight:800;">الأستاذ عبد الحميد سالمة</span></div>
              <div><strong style="color:#483878;">تاريخ التصدير:</strong> <span style="font-family:'Cairo',sans-serif;color:#444444;font-weight:700;" dir="ltr">${escapeHtml(readableDate)}</span></div>
              <div><strong style="color:#483878;">المُصدِر:</strong> <span style="color:#444444;font-weight:700;">${escapeHtml(exportedBy)}</span> | <strong style="color:#483878;">النطاق:</strong> <span style="color:#444444;font-weight:700;">${escapeHtml(filterLabel)}</span></div>
            </div>
          </div>

          ${kpiStripHtml}

          <!-- Trips Table -->
          <div style="border:1px solid #A9DDF5;border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:right;">
              <thead>
                <tr style="background:#483878;color:#FFFFFF;">
                  <th style="padding:8px 6px;text-align:center;font-weight:800;width:32px;">#</th>
                  <th style="padding:8px 6px;font-weight:800;">رقم الرحلة</th>
                  <th style="padding:8px 6px;font-weight:800;">الحافلة</th>
                  <th style="padding:8px 6px;font-weight:800;">السائق</th>
                  <th style="padding:8px 6px;font-weight:800;">نقطة الانطلاق</th>
                  <th style="padding:8px 6px;font-weight:800;">الوجهة</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;">التاريخ</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;">الانطلاق</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;">الوصول</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;">الإنجاز</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;">الركاب</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;">الحالة</th>
                  <th style="padding:8px 6px;font-weight:800;">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #E2E8F0;font-size:10px;color:#64748B;font-weight:700;">
          <span>${escapeHtml(companyName)} — نظام إدارة عمليات الأسطول (DMTC)</span>
          <span>عدد الرحلات في التقرير: ${trips.length} رحلة</span>
          <span>صفحة ${pageIndex + 1} من ${totalPages}</span>
        </div>
      </div>
    `;
  };

  let rowCounter = 0;
  const pagesHtml = pages
    .map((pageTrips, idx) => {
      const html = buildPageHtml(pageTrips, idx, rowCounter);
      rowCounter += pageTrips.length;
      return html;
    })
    .join('');

  const fullDocHtml = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background: #FFFFFF;
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            -webkit-font-smoothing: antialiased;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0';
  iframe.style.width = '1123px';
  iframe.style.height = '794px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('تعذر تهيئة مستند PDF.');
    }

    iframeDoc.open();
    iframeDoc.write(fullDocHtml);
    iframeDoc.close();

    // Wait for fonts & images to settle inside the isolated iframe
    await new Promise<void>((resolve) => {
      const finish = () => setTimeout(resolve, 250);
      if (iframeDoc.readyState === 'complete') {
        finish();
      } else {
        iframe.onload = finish;
        setTimeout(finish, 1200);
      }
    });

    if (iframeDoc.fonts?.ready) {
      await Promise.race([
        iframeDoc.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageElements = Array.from(iframeDoc.querySelectorAll('.pdf-page')) as HTMLElement[];
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        width: 1123,
        height: 794,
        windowWidth: 1123,
        windowHeight: 794,
      });

      const imgData = canvas.toDataURL('image/png');
      if (i > 0) {
        pdf.addPage('a4', 'landscape');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
    }

    const filename = `تقرير_الرحلات_DMTC_${formatFileTimestamp(now)}.pdf`;
    pdf.save(filename);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
