import * as XLSX from 'xlsx';
import { ColumnMapping, ImportedRowPreview, Trip } from '../types';
import {
  parseExcelTimeOrDate,
  tryParseExcelDate,
  addDaysToDateString,
  buildTripDateTimes,
  getTodayDateString,
  getEffectiveArrivalInfo,
} from './dateTimeUtils';

// Standard column alias dictionary (Arabic & English)
const ALIASES: Record<keyof ColumnMapping, string[]> = {
  tripNumber: [
    'رقم الرحلة',
    'الرحلة',
    'كود الرحلة',
    'رمز الرحلة',
    'trip id',
    'trip number',
    'trip no',
    'trip',
    'id',
  ],
  busId: [
    'رقم الحافلة',
    'رقم الباص',
    'رقم المركبة',
    'الحافلة',
    'الباص',
    'المركبة',
    'bus id',
    'bus number',
    'bus no',
    'vehicle number',
    'vehicle id',
    'bus',
  ],
  driverName: [
    'السائق',
    'اسم السائق',
    'السائقين',
    'كابتن الرحلة',
    'قائد الحافلة',
    'driver name',
    'driver',
    'captain',
  ],
  origin: [
    'من',
    'الانطلاق',
    'نقطة الانطلاق',
    'محطة الانطلاق',
    'محطة المغادرة',
    'المغادرة من',
    'origin',
    'from',
    'departure point',
    'departure station',
  ],
  destination: [
    'إلى',
    'الى',
    'الوجهة',
    'نقطة الوصول',
    'محطة الوصول',
    'الوصول إلى',
    'destination',
    'to',
    'arrival point',
    'arrival station',
  ],
  departureTime: [
    'وقت الانطلاق',
    'موعد الانطلاق',
    'وقت المغادرة',
    'موعد المغادرة',
    'الانطلاق',
    'وقت البدء',
    'departure time',
    'start time',
    'departure',
    'dep time',
  ],
  arrivalTime: [
    'وقت الوصول',
    'موعد الوصول',
    'الوصول',
    'وقت النهاية',
    'arrival time',
    'end time',
    'arrival',
    'arr time',
  ],
  tripDate: [
    'التاريخ',
    'تاريخ الرحلة',
    'تاريخ التشغيل',
    'يوم الرحلة',
    'date',
    'trip date',
    'operation date',
  ],
  route: [
    'المسار',
    'خط السير',
    'الخط',
    'route',
    'route name',
    'line',
  ],
  passengerCount: [
    'عدد الركاب',
    'الركاب',
    'الحمولة',
    'passengers',
    'passenger count',
    'pax',
  ],
  plateNumber: [
    'رقم اللوحة',
    'اللوحة',
    'plate number',
    'plate',
    'license plate',
  ],
  notes: [
    'ملاحظات',
    'ملاحظة',
    'التفاصيل',
    'notes',
    'remarks',
    'comments',
  ],
  actualDepartureTime: [
    'الانطلاق الفعلي',
    'وقت الانطلاق الفعلي',
    'actual departure',
    'actual departure time',
  ],
  actualArrivalTime: [
    'الوصول الفعلي',
    'وقت الوصول الفعلي',
    'actual arrival',
    'actual arrival time',
  ],
  actualStatus: [
    'الحالة الفعلية',
    'حالة التشغيل',
    'actual status',
    'operation status',
  ],
  delayMinutes: [
    'دقائق التأخير',
    'التأخير بالدقائق',
    'التأخير',
    'delay minutes',
    'delay min',
  ],
};

export interface WorkbookInfo {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
}

const MAX_EXCEL_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

/**
 * Reads an uploaded Excel / CSV file into workbook representation
 */
export async function readExcelFile(file: File): Promise<WorkbookInfo> {
  const lowerName = (file.name || '').toLowerCase();
  const isAllowedExtension = ALLOWED_EXCEL_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!isAllowedExtension) {
    throw new Error('صيغة الملف غير مدعومة. يرجى اختيار ملف بصيغة .xlsx أو .xls أو .csv.');
  }
  if (file.size > MAX_EXCEL_FILE_SIZE_BYTES) {
    throw new Error('حجم الملف يتجاوز الحد الأقصى المسموح به (5 ميجابايت).');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
    sheetRows: 5010,
  });
  return {
    sheetNames: workbook.SheetNames,
    workbook,
  };
}

/**
 * Extracts raw JSON rows and column headers from chosen sheet
 */
export function extractSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string
): {
  headers: string[];
  rawRows: Record<string, any>[];
} {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { headers: [], rawRows: [] };
  }

  // Read as array of arrays to find header row reliably
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!data || data.length === 0) {
    return { headers: [], rawRows: [] };
  }

  // Find header row: row with the most non-empty string cells in first 5 rows
  let headerRowIndex = 0;
  let maxCols = 0;
  for (let i = 0; i < Math.min(data.length, 6); i++) {
    const nonEmpties = data[i].filter(cell => String(cell || '').trim().length > 0).length;
    if (nonEmpties > maxCols) {
      maxCols = nonEmpties;
      headerRowIndex = i;
    }
  }

  const rawHeaders = data[headerRowIndex].map(h => String(h || '').trim());
  const headers = rawHeaders.filter(h => h.length > 0);

  // Convert subsequent rows to objects
  const rawRows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < data.length; r++) {
    const row = data[r];
    // skip completely blank lines
    if (!row || row.every((c: any) => String(c || '').trim() === '')) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    headers.forEach((header, colIdx) => {
      rowObj[header] = row[colIdx] ?? '';
    });
    rawRows.push(rowObj);
  }

  return { headers, rawRows };
}

/**
 * Auto-detects the best column mapping for each field
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    tripNumber: '',
    busId: '',
    driverName: '',
    origin: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    tripDate: '',
    route: '',
    passengerCount: '',
    plateNumber: '',
    notes: '',
    actualDepartureTime: '',
    actualArrivalTime: '',
    actualStatus: '',
    delayMinutes: '',
  };

  const normalizedHeaders = headers.map(h => ({
    original: h,
    cleaned: h.toLowerCase().trim().replace(/[_-\s]+/g, ' '),
  }));

  for (const field of Object.keys(ALIASES) as (keyof ColumnMapping)[]) {
    const aliases = ALIASES[field];
    for (const h of normalizedHeaders) {
      // Direct exact or includes check
      const matched = aliases.some(alias => {
        const cleanAlias = alias.toLowerCase().trim();
        return h.cleaned === cleanAlias || h.cleaned.includes(cleanAlias) || cleanAlias.includes(h.cleaned);
      });

      if (matched && !Object.values(mapping).includes(h.original)) {
        mapping[field] = h.original;
        break;
      }
    }
  }

  return mapping;
}

function normalizeExcelActualStatus(
  rawValue: unknown
): Trip['actualStatus'] | undefined {
  const str = String(rawValue || '').trim().toLowerCase();
  if (!str) return undefined;
  if (str.includes('delay') || str.includes('تأخر') || str.includes('تاخر') || str.includes('متأخر')) {
    return 'delayed';
  }
  if (str.includes('cancel') || str.includes('ملغ') || str.includes('الغ') || str.includes('إلغ')) {
    return 'cancelled';
  }
  if (str.includes('complet') || str.includes('مكتمل') || str.includes('منته') || str.includes('انته') || str.includes('وصل')) {
    return 'completed';
  }
  if (str.includes('start') || str.includes('بد') || str.includes('جار')) {
    return 'started';
  }
  return undefined;
}

export type ImportComputedTripStatus = 'auto_completed' | 'in_progress' | 'upcoming';

export interface ImportedTripStatusClassification {
  computedStatus: ImportComputedTripStatus;
  isElapsedAtImport: boolean;
  effectiveArrivalDateTime: string;
  effectiveArrivalMs: number;
  usedActualArrival: boolean;
}

/**
 * Compares the current import timestamp against departure and effective arrival times.
 * If an actualArrivalTime column is present and valid, it takes priority over scheduled arrivalTime.
 * - effectiveArrivalMs <= nowMs -> 'auto_completed' (منجزة تلقائياً)
 * - depMs <= nowMs < effectiveArrivalMs -> 'in_progress' (على الطريق)
 * - nowMs < depMs -> 'upcoming' (قادمة)
 */
export function classifyImportedTripStatus(
  trip: Partial<Trip>,
  nowMs: number = Date.now()
): ImportedTripStatusClassification {
  const depMs = trip.departureDateTime ? new Date(trip.departureDateTime).getTime() : Number.NaN;
  const { effectiveArrivalDateTime, effectiveArrivalMs, usedActualArrival } =
    getEffectiveArrivalInfo(trip);

  if (trip.actualStatus === 'cancelled') {
    return {
      computedStatus: 'upcoming',
      isElapsedAtImport: false,
      effectiveArrivalDateTime,
      effectiveArrivalMs,
      usedActualArrival,
    };
  }

  if (!Number.isNaN(effectiveArrivalMs) && nowMs >= effectiveArrivalMs) {
    return {
      computedStatus: 'auto_completed',
      isElapsedAtImport: true,
      effectiveArrivalDateTime,
      effectiveArrivalMs,
      usedActualArrival,
    };
  }

  if (!Number.isNaN(depMs) && nowMs >= depMs && (Number.isNaN(effectiveArrivalMs) || nowMs < effectiveArrivalMs)) {
    return {
      computedStatus: 'in_progress',
      isElapsedAtImport: false,
      effectiveArrivalDateTime,
      effectiveArrivalMs,
      usedActualArrival,
    };
  }

  return {
    computedStatus: 'upcoming',
    isElapsedAtImport: false,
    effectiveArrivalDateTime,
    effectiveArrivalMs,
    usedActualArrival,
  };
}

/**
 * Applies the import-time status classification onto a finalized Trip object before saving:
 * - auto_completed -> isElapsedAtImport: true (no delay alerts)
 * - in_progress -> actualStatus: 'started' (unless explicitly marked delayed/cancelled) so it enters live on-road tracking immediately
 * - upcoming -> leaves actualStatus untouched for normal live countdown and departure alerts
 */
export function applyImportedTripClassification(
  trip: Trip,
  nowMs: number = Date.now()
): Trip {
  if (trip.actualStatus === 'cancelled') {
    return { ...trip, isElapsedAtImport: false };
  }

  const classification = classifyImportedTripStatus(trip, nowMs);

  if (classification.computedStatus === 'auto_completed') {
    return {
      ...trip,
      isElapsedAtImport: true,
    };
  }

  if (classification.computedStatus === 'in_progress') {
    const hasDelayFlag =
      trip.actualStatus === 'delayed' || Boolean(trip.delayMinutes && trip.delayMinutes > 0);
    return {
      ...trip,
      isElapsedAtImport: false,
      actualStatus: hasDelayFlag ? trip.actualStatus : trip.actualStatus || 'started',
    };
  }

  return {
    ...trip,
    isElapsedAtImport: false,
  };
}

/**
 * Validates and converts raw rows into preview records with error and warning annotations
 */
export function validateAndParseRows(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  defaultDate?: string,
  afterMidnightNextDay: boolean = false
): ImportedRowPreview[] {
  const previews: ImportedRowPreview[] = [];
  const targetDate = defaultDate || getTodayDateString();
  const importNowMs = Date.now();

  rawRows.forEach((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawTripNum = String(row[mapping.tripNumber] || '').trim();
    const rawBusId = String(row[mapping.busId] || '').trim();
    const rawDriver = String(row[mapping.driverName] || '').trim();
    const rawOrigin = String(row[mapping.origin] || '').trim();
    const rawDest = String(row[mapping.destination] || '').trim();

    const rawDepTime = row[mapping.departureTime];
    const rawArrTime = row[mapping.arrivalTime];
    const hasDateColumn = Boolean(mapping.tripDate);
    const rawDateCell = hasDateColumn ? row[mapping.tripDate!] : undefined;
    const isDateCellNonEmpty =
      hasDateColumn &&
      rawDateCell !== null &&
      rawDateCell !== undefined &&
      String(rawDateCell).trim() !== '';

    // Cleaned times
    const departureTime = parseExcelTimeOrDate(rawDepTime);
    const arrivalTime = parseExcelTimeOrDate(rawArrTime);

    let tripDate = targetDate;
    let hasRowDate = false;
    if (isDateCellNonEmpty) {
      const parsedDate = tryParseExcelDate(rawDateCell);
      if (parsedDate) {
        tripDate = parsedDate;
        hasRowDate = true;
      } else {
        warnings.push('تعذّر قراءة تاريخ هذا الصف، تم استخدام تاريخ التشغيل');
      }
    }

    // Apply after-midnight next-day rule ONLY to rows without a date column
    if (!hasDateColumn && !hasRowDate && afterMidnightNextDay && departureTime) {
      const depHour = parseInt(departureTime.split(':')[0] || '', 10);
      if (!isNaN(depHour) && depHour < 6) {
        tripDate = addDaysToDateString(tripDate, 1);
      }
    }

    // Validation checks
    if (!departureTime) {
      errors.push('وقت الانطلاق غير صالح أو فارغ');
    }
    if (!arrivalTime) {
      errors.push('وقت الوصول غير صالح أو فارغ');
    }

    if (!rawOrigin) {
      warnings.push('نقطة الانطلاق غير محددة');
    }
    if (!rawDest) {
      warnings.push('نقطة الوصول غير محددة');
    }
    if (!rawBusId) {
      warnings.push('رقم الحافلة غير مسجل');
    }
    if (!rawDriver) {
      warnings.push('اسم السائق غير مسجل');
    }

    let parsedTrip: Partial<Trip> | undefined;

    if (departureTime && arrivalTime) {
      const { departureDateTime, arrivalDateTime, isOvernight, durationMinutes } =
        buildTripDateTimes(tripDate, departureTime, arrivalTime, true);

      if (durationMinutes === 0) {
        warnings.push('مدة الرحلة محسوبة بـ 0 دقيقة (وقت الوصول يطابق وقت الانطلاق)');
      }

      const parsedActualStatus = mapping.actualStatus
        ? normalizeExcelActualStatus(row[mapping.actualStatus])
        : undefined;
      const parsedDelayMinutes = mapping.delayMinutes
        ? parseInt(String(row[mapping.delayMinutes]), 10) || 0
        : 0;
      const parsedActualDepartureTime = mapping.actualDepartureTime
        ? parseExcelTimeOrDate(row[mapping.actualDepartureTime])
        : undefined;
      const parsedActualArrivalTime = mapping.actualArrivalTime
        ? parseExcelTimeOrDate(row[mapping.actualArrivalTime])
        : undefined;

      const candidateTrip: Partial<Trip> = {
        id: `imported-${index + 1}-${Date.now()}`,
        tripNumber: rawTripNum || `TRP-${100 + index + 1}`,
        busId: rawBusId || 'غير محدد',
        driverName: rawDriver || 'غير محدد',
        origin: rawOrigin || 'محطة الانطلاق',
        destination: rawDest || 'الوجهة المحددة',
        tripDate,
        departureTime,
        arrivalTime,
        departureDateTime,
        arrivalDateTime,
        isOvernight,
        durationMinutes,
        passengerCount: mapping.passengerCount ? parseInt(String(row[mapping.passengerCount]), 10) || 0 : undefined,
        route: mapping.route ? String(row[mapping.route] || '').trim() : undefined,
        plateNumber: mapping.plateNumber ? String(row[mapping.plateNumber] || '').trim() : undefined,
        notes: mapping.notes ? String(row[mapping.notes] || '').trim() : undefined,
        actualDepartureTime: parsedActualDepartureTime || undefined,
        actualArrivalTime: parsedActualArrivalTime || undefined,
        actualStatus: parsedActualStatus,
        delayMinutes: mapping.delayMinutes ? parsedDelayMinutes : undefined,
      };

      const classification = classifyImportedTripStatus(candidateTrip, importNowMs);
      parsedTrip = {
        ...candidateTrip,
        isElapsedAtImport: classification.isElapsedAtImport,
      };
    }

    previews.push({
      rowIndex: index + 1,
      raw: row,
      parsed: parsedTrip,
      isValid: errors.length === 0,
      errors,
      warnings,
      isExcluded: errors.length > 0, // exclude invalid rows by default, user can toggle
    });
  });

  return previews;
}

export type MergeTripsMode = 'skip' | 'update';

export interface MergeTripsResult {
  merged: Trip[];
  added: number;
  skipped: number;
  updated: number;
  duplicatesInFile: number;
}

function getTripMergeKey(trip: Trip): string {
  const num = (trip.tripNumber || '').trim();
  const isAutoGenerated = !num || /^TRP-\d+$/i.test(num);
  if (!isAutoGenerated) {
    return `${num.toUpperCase()}|${trip.tripDate}`;
  }
  return `${(trip.busId || '').trim()}|${trip.tripDate}|${(trip.departureTime || '').trim()}`;
}

export function mergeTrips(
  existing: Trip[],
  incoming: Trip[],
  mode: MergeTripsMode
): MergeTripsResult {
  const merged: Trip[] = [];
  const usedIds = new Set<string>();
  const existingIndexByKey = new Map<string, number>();

  for (const trip of existing) {
    let uniqueId = trip.id || `trip-${merged.length + 1}`;
    if (usedIds.has(uniqueId)) {
      let suffix = 1;
      while (usedIds.has(`${uniqueId}-${suffix}`)) {
        suffix++;
      }
      uniqueId = `${uniqueId}-${suffix}`;
    }
    usedIds.add(uniqueId);
    const normalizedTrip = uniqueId === trip.id ? trip : { ...trip, id: uniqueId };
    const key = getTripMergeKey(normalizedTrip);
    if (!existingIndexByKey.has(key)) {
      existingIndexByKey.set(key, merged.length);
    }
    merged.push(normalizedTrip);
  }

  let added = 0;
  let skipped = 0;
  let updated = 0;
  let duplicatesInFile = 0;
  const seenIncomingKeys = new Set<string>();

  for (const incTrip of incoming) {
    const key = getTripMergeKey(incTrip);
    if (seenIncomingKeys.has(key)) {
      duplicatesInFile++;
      continue;
    }
    seenIncomingKeys.add(key);

    const existingIdx = existingIndexByKey.get(key);
    if (existingIdx === undefined) {
      let uniqueId = incTrip.id || `imported-${Date.now()}-${merged.length + 1}`;
      if (usedIds.has(uniqueId)) {
        let suffix = 1;
        while (usedIds.has(`${uniqueId}-${suffix}`)) {
          suffix++;
        }
        uniqueId = `${uniqueId}-${suffix}`;
      }
      usedIds.add(uniqueId);
      const tripToAdd = uniqueId === incTrip.id ? incTrip : { ...incTrip, id: uniqueId };
      existingIndexByKey.set(key, merged.length);
      merged.push(tripToAdd);
      added++;
    } else if (mode === 'skip') {
      skipped++;
    } else {
      const current = merged[existingIdx];
      merged[existingIdx] = {
        ...current,
        busId: incTrip.busId,
        driverName: incTrip.driverName,
        origin: incTrip.origin,
        destination: incTrip.destination,
        departureTime: incTrip.departureTime,
        arrivalTime: incTrip.arrivalTime,
        departureDateTime: incTrip.departureDateTime,
        arrivalDateTime: incTrip.arrivalDateTime,
        isOvernight: incTrip.isOvernight,
        durationMinutes: incTrip.durationMinutes,
        route: incTrip.route,
        plateNumber: incTrip.plateNumber,
        passengerCount: incTrip.passengerCount,
        notes: incTrip.notes,
        id: current.id,
        actualDepartureTime: incTrip.actualDepartureTime ?? current.actualDepartureTime,
        actualArrivalTime: incTrip.actualArrivalTime ?? current.actualArrivalTime,
        actualStatus: incTrip.actualStatus ?? current.actualStatus,
        delayMinutes: incTrip.delayMinutes ?? current.delayMinutes,
        isElapsedAtImport: incTrip.isElapsedAtImport,
      };
      updated++;
    }
  }

  return {
    merged,
    added,
    skipped,
    updated,
    duplicatesInFile,
  };
}

