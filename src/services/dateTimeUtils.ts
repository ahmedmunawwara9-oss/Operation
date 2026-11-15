/**
 * Date and time parsing, normalization, and formatting utility functions.
 * Handles Excel serial numbers, fractional days, Arabic AM/PM, overnight trips,
 * and time-zone safe arithmetic.
 */

// Parse Excel serial dates and fractions
export function parseExcelTimeOrDate(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // If already a string
  if (typeof value === 'string') {
    return cleanTimeString(value);
  }

  // If Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const rounded = new Date(Math.round(value.getTime() / 60000) * 60000);
    const hours = String(rounded.getHours()).padStart(2, '0');
    const minutes = String(rounded.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // If number from Excel
  if (typeof value === 'number') {
    if (!isFinite(value) || value < 0) return '';
    // If it's pure time fraction (< 1)
    if (value < 1) {
      const totalSeconds = Math.round(value * 86400);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Full Excel serial date/time (> 1): use Math.round to nearest minute instead of raw fractional drift
    const totalMinutes = Math.round(value * 1440) % 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return String(value);
}

// Clean and normalize time strings like "8:30 AM", "08:30 ص", "21:15", "9:00م"
export function cleanTimeString(str: string): string {
  if (!str) return '';
  let trimmed = str.trim();

  // Normalize Arabic letters
  trimmed = trimmed
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30)) // Arabic numerals to western
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30)); // Eastern Arabic

  const isPM = /م|pm|p\.m\./i.test(trimmed);
  const isAM = /ص|am|a\.m\./i.test(trimmed);

  // Remove letters
  const numbersOnly = trimmed.replace(/[^0-9:]/g, '');
  const parts = numbersOnly.split(':');

  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return '';

    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }

    return `${String(hours % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  return trimmed;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

// Try parsing a date cell into YYYY-MM-DD, returning null if parsing fails
export function tryParseExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const rounded = new Date(Math.round(value.getTime() / 60000) * 60000);
    const year = rounded.getFullYear();
    const month = String(rounded.getMonth() + 1).padStart(2, '0');
    const day = String(rounded.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number') {
    if (!isFinite(value) || value < 1) return null;
    // Excel day count (1899-12-30 UTC epoch) using Math.floor + UTC fields so no day shift occurs
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Math.floor(value) * 86400000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const normalized = normalizeToWesternDigits(value.trim());
    if (!normalized) return null;
    const dateToken = normalized.split(/[\sT]+/)[0];

    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateToken)) {
      const [y, m, d] = dateToken.split('-').map(n => parseInt(n, 10));
      return isValidCalendarDate(y, m, d) ? dateToken : null;
    }

    // Check YYYY/MM/DD, DD/MM/YYYY, DD/MM/YY (with /, -, or .)
    const parts = dateToken.split(/[/.-]/);
    if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
      let year: number;
      let month: number;
      let day: number;

      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else if (parts[2].length === 2) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = 2000 + parseInt(parts[2], 10);
      } else {
        return null;
      }

      if (!isValidCalendarDate(year, month, day)) return null;
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

// Extract standard YYYY-MM-DD date string
export function parseExcelDate(value: any, fallbackDateStr?: string): string {
  const parsed = tryParseExcelDate(value);
  return parsed || fallbackDateStr || getTodayDateString();
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates start and end timestamps taking into account overnight trips.
 * If arrivalTime <= departureTime, the trip is considered overnight and ends the next calendar day.
 */
export function buildTripDateTimes(
  dateStr: string,
  departureTime: string,
  arrivalTime: string,
  allowOvernightInference: boolean = true
): {
  departureDateTime: string;
  arrivalDateTime: string;
  isOvernight: boolean;
  durationMinutes: number;
} {
  const [dHour, dMin] = (departureTime || '00:00').split(':').map(n => parseInt(n, 10) || 0);
  const [aHour, aMin] = (arrivalTime || '00:00').split(':').map(n => parseInt(n, 10) || 0);

  const depDate = new Date(`${dateStr}T${String(dHour).padStart(2, '0')}:${String(dMin).padStart(2, '0')}:00`);

  let arrDate = new Date(`${dateStr}T${String(aHour).padStart(2, '0')}:${String(aMin).padStart(2, '0')}:00`);
  let isOvernight = false;

  // If arrival is earlier than departure on same day, it spans into next day
  if (arrDate.getTime() <= depDate.getTime() && allowOvernightInference) {
    arrDate = new Date(arrDate.getTime() + 86400000); // add 24 hours
    isOvernight = true;
  }

  const durationMs = arrDate.getTime() - depDate.getTime();
  const durationMinutes = Math.max(0, Math.round(durationMs / 60000));

  return {
    departureDateTime: depDate.toISOString(),
    arrivalDateTime: arrDate.toISOString(),
    isOvernight,
    durationMinutes,
  };
}

/**
 * Formats duration in Arabic / English
 */
export function formatDuration(minutes: number, lang: 'ar' | 'en' = 'ar'): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (lang === 'ar') {
    if (hours === 0) return `${mins} دقيقة`;
    if (mins === 0) return `${hours} ساعة`;
    return `${hours} س و ${mins} د`;
  }

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Arabic countdown relative text
 */
export function getRelativeTimeText(
  targetTime: Date,
  currentTime: Date,
  isDeparture: boolean,
  lang: 'ar' | 'en' = 'ar'
): string {
  const diffMinutes = Math.round((targetTime.getTime() - currentTime.getTime()) / 60000);

  if (lang === 'ar') {
    if (diffMinutes > 0) {
      if (diffMinutes < 60) {
        return isDeparture ? `تنطلق بعد ${diffMinutes} دقيقة` : `تصل خلال ${diffMinutes} دقيقة`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return isDeparture
        ? `تنطلق بعد ${hours} س و ${mins} د`
        : `تصل خلال ${hours} س و ${mins} د`;
    } else if (diffMinutes === 0) {
      return isDeparture ? 'موعد الانطلاق الآن' : 'موعد الوصول الآن';
    } else {
      const passed = Math.abs(diffMinutes);
      if (passed < 60) {
        return isDeparture ? `انطلقت منذ ${passed} دقيقة` : `تجاوزت الموعد بـ ${passed} دقيقة`;
      }
      const hours = Math.floor(passed / 60);
      return isDeparture ? `انطلقت منذ ${hours} ساعة` : `تجاوزت الموعد بـ ${hours} ساعة`;
    }
  }

  // English
  if (diffMinutes > 0) {
    return isDeparture ? `Departs in ${diffMinutes}m` : `Arrives in ${diffMinutes}m`;
  } else if (diffMinutes === 0) {
    return isDeparture ? 'Departing now' : 'Arriving now';
  } else {
    return `${Math.abs(diffMinutes)}m ago`;
  }
}

/**
 * Converts Eastern Arabic / Persian digits to unified Western digits (0-9)
 */
export function normalizeToWesternDigits(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x06f0 + 0x30));
}

/**
 * Format Arabic date display with unified Western numerals (e.g. السبت، 14 نوفمبر 2026)
 */
export function formatArabicDate(date: Date, timeZone: string = 'Asia/Riyadh'): string {
  try {
    const formatted = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
    return normalizeToWesternDigits(formatted);
  } catch {
    return normalizeToWesternDigits(date.toLocaleDateString('ar-SA'));
  }
}

/**
 * Format unified HH:mm time string with Western numerals
 */
export function formatUnifiedTime(date: Date, timeZone: string = 'Asia/Riyadh'): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return normalizeToWesternDigits(formatted);
  } catch {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Format unified date + time (YYYY-MM-DD HH:mm) with Western numerals
 */
export function formatUnifiedDateTime(
  value: Date | string,
  timeZone: string = 'Asia/Riyadh'
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '';
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return normalizeToWesternDigits(formatted.replace(',', ''));
  } catch {
    return `${date.toISOString().slice(0, 10)} ${formatUnifiedTime(date, timeZone)}`;
  }
}

/**
 * Shortens long multi-word driver names cleanly without mid-word truncation
 */
export function formatShortDriverName(fullName?: string): string {
  if (!fullName) return 'غير محدد';
  const clean = fullName.trim().replace(/\s+/g, ' ');
  if (!clean) return 'غير محدد';
  const words = clean.split(' ');
  if (words.length >= 3) {
    return `${words[0]} ${words[words.length - 1]}`;
  }
  if (clean.length > 18 && words.length === 2) {
    return `${words[0]} ${words[1].slice(0, 6)}.`;
  }
  return clean;
}

/**
 * Format digital clock HH:mm:ss with timezone (unified Western numerals)
 */
export function formatDigitalClock(date: Date, timeZone: string = 'Asia/Riyadh'): {
  timeStr: string;
  secondsStr: string;
  periodStr: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';

    return {
      timeStr: `${hour}:${minute}`,
      secondsStr: second,
      periodStr: parseInt(hour, 10) >= 12 ? 'م' : 'ص',
    };
  } catch {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return {
      timeStr: `${h}:${m}`,
      secondsStr: s,
      periodStr: date.getHours() >= 12 ? 'م' : 'ص',
    };
  }
}
