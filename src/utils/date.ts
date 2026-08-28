import type { TFunction } from 'i18next';

export function toDateString(date: string | Date | null | undefined): string {
  if (!date) return '';
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '';
    return dateToIso(date);
  }
  return String(date).split('T')[0];
}

export function todayString(): string {
  return dateToIso(new Date());
}

/** Whole calendar days from today to a date (local). Positive = future, 0 = today, negative = past. */
export function daysUntilDate(date: string | Date | null | undefined): number | null {
  const iso = typeof date === 'string' ? toDateString(date) : date ? dateToIso(date) : '';
  if (!iso) return null;
  const target = parseLocalDate(iso);
  if (!target) return null;
  const today = parseLocalDate(todayString());
  if (!today) return null;
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(date: string | null | undefined): string {
  const iso = toDateString(date);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y.slice(-2)}`;
}

/** Friendlier inbox/detail date: "7 Aug 2026" (locale-aware). */
export function formatFriendlyDate(date: string | Date | null | undefined, language = 'en'): string {
  if (!date || date === '—') return '—';
  const parsed = typeof date === 'string' ? parseLocalDate(toDateString(date)) : date;
  if (!parsed) return formatDisplayDate(typeof date === 'string' ? date : undefined);
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-GB';
  try {
    return parsed.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return formatDisplayDate(typeof date === 'string' ? date : undefined);
  }
}

/** Inbox timestamps: "in 2 days", "yesterday", else a friendly date. */
export function formatRelativeDay(
  date: string | Date | null | undefined,
  t?: TFunction,
  language = 'en',
): string {
  if (!date || date === '—' || date === 'Action needed' || date === 'System Alert') return '';
  const iso = typeof date === 'string' ? toDateString(date) : dateToIso(date);
  const parsed = parseLocalDate(iso);
  if (!parsed) return formatFriendlyDate(date, language);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (typeof t !== 'function') return formatFriendlyDate(date, language);
  if (diff === 0) return t('notifications.relative.today');
  if (diff === 1) return t('notifications.relative.tomorrow');
  if (diff === -1) return t('notifications.relative.yesterday');
  if (diff > 1 && diff < 14) return t('notifications.relative.inDays', { count: diff });
  if (diff < -1 && diff > -14) return t('notifications.relative.daysAgo', { count: Math.abs(diff) });
  return formatFriendlyDate(date, language);
}

/** User-facing time: "11:34 am" (12-hour, lowercase meridiem). */
export function formatDisplayTime(
  value: string | Date | null | undefined,
  language = 'en',
): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-US';
  try {
    const raw = date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return raw.replace(/\s?(AM|PM)\s*$/i, (_, meridiem: string) => ` ${meridiem.toLowerCase()}`);
  } catch {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ap}`;
  }
}

/** User-facing date-time: dd-mm-yy 11:34 am */
export function formatDisplayDateTime(
  date: string | Date | null | undefined,
  language = 'en',
): string {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return typeof date === 'string' ? formatDisplayDate(date) : '—';
  }
  const iso = dateToIso(parsed);
  return `${formatDisplayDate(iso)} ${formatDisplayTime(parsed, language)}`;
}

/** Activity/log timestamps: "Today · 11:34 am" or "04-07-26 · 11:34 am". */
export function formatLogTimestamp(
  value: string | Date | null | undefined,
  t?: TFunction,
  language = 'en',
): string {
  if (!value) return '—';
  const time = formatDisplayTime(value, language);
  if (typeof t === 'function') {
    const rel = formatRelativeDay(value, t, language);
    if (rel) return `${rel} · ${time}`;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === 'string' ? formatDisplayDate(value) : '—';
  }
  return `${formatDisplayDate(dateToIso(parsed))} · ${time}`;
}

function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  if (!d) return todayString();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as local midnight (no timezone drift). */
export function isoToLocalDate(iso: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toDateString(iso));
  if (parts) return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return new Date();
}

export function isDateRangeValid(min?: Date, max?: Date): boolean {
  if (!min || !max) return true;
  return min.getTime() <= max.getTime();
}

/** Local start of attendance week (matches API week_starts_on). */
export function startOfAttendanceWeek(
  date = new Date(),
  weekStartsOn: 'monday' | 'sunday' = 'monday'
): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const startDow = weekStartsOn === 'sunday' ? 0 : 1;
  const diff = (day - startDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** Inclusive from/to ISO dates for this or last attendance week. */
export function attendanceWeekRange(
  which: 'this' | 'last',
  weekStartsOn: 'monday' | 'sunday' = 'monday'
): { from: string; to: string } {
  let start = startOfAttendanceWeek(new Date(), weekStartsOn);
  if (which === 'last') {
    start = new Date(start);
    start.setDate(start.getDate() - 7);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: dateToIso(start), to: dateToIso(end) };
}

/** Local calendar day relative to today: 'today' | 'yesterday' | null. */
export function attendanceDayRelative(
  date: string | Date | null | undefined
): 'today' | 'yesterday' | null {
  const iso = typeof date === 'string' ? toDateString(date) : date ? dateToIso(date) : '';
  if (!iso) return null;
  const today = todayString();
  if (iso === today) return 'today';
  const y = new Date();
  y.setHours(0, 0, 0, 0);
  y.setDate(y.getDate() - 1);
  if (iso === dateToIso(y)) return 'yesterday';
  return null;
}

/** Day header for attendance history: "Mon 18 Aug". */
export function formatAttendanceDayLabel(
  date: string | Date | null | undefined,
  language = 'en'
): string {
  if (!date || date === '—') return '—';
  const iso = typeof date === 'string' ? toDateString(date) : dateToIso(date);
  const parsed = iso ? isoToLocalDate(iso) : null;
  if (!parsed) return formatDisplayDate(typeof date === 'string' ? date : undefined);
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-GB';
  try {
    return parsed.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return formatDisplayDate(typeof date === 'string' ? date : undefined);
  }
}

/** Week range for History: "17–23 Aug" or "28 Jul – 3 Aug". */
export function formatAttendanceWeekRangeLabel(
  from: string | Date | null | undefined,
  to: string | Date | null | undefined,
  language = 'en'
): string {
  const fromIso = typeof from === 'string' ? toDateString(from) : from ? dateToIso(from) : '';
  const toIso = typeof to === 'string' ? toDateString(to) : to ? dateToIso(to) : '';
  const a = fromIso ? isoToLocalDate(fromIso) : null;
  const b = toIso ? isoToLocalDate(toIso) : null;
  if (!a || !b) {
    const left = formatDisplayDate(typeof from === 'string' ? from : fromIso || undefined);
    const right = formatDisplayDate(typeof to === 'string' ? to : toIso || undefined);
    if (left === '—' && right === '—') return '—';
    return `${left} – ${right}`;
  }
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-GB';
  try {
    const sameMonth =
      a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameMonth) {
      const end = b.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      return `${a.getDate()}–${end}`;
    }
    const left = a.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const right = b.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `${left} – ${right}`;
  } catch {
    return `${formatDisplayDate(fromIso)} – ${formatDisplayDate(toIso)}`;
  }
}

/** Group check-in rows by local calendar day (newest days first). */
export function groupCheckInsByDay<T extends { checked_in_at?: string | null }>(
  checkIns: T[] | null | undefined
): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const row of checkIns || []) {
    const day = toDateString(row.checked_in_at);
    if (!day) continue;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(row);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Keep an ISO date inside optional min/max (local calendar days). */
export function clampIsoDate(iso: string, min?: Date, max?: Date): string {
  const normalized = toDateString(iso);
  if (!normalized) return todayString();
  if (!isDateRangeValid(min, max)) {
    return max ? dateToIso(max) : min ? dateToIso(min) : normalized;
  }
  let d = isoToLocalDate(normalized);
  if (min && d < min) d = min;
  if (max && d > max) d = max;
  return dateToIso(d);
}
