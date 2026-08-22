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
  t?: (key: string, options?: object) => string,
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

export function formatDisplayDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return typeof date === 'string' ? formatDisplayDate(date) : '—';
  }
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear()).slice(-2);
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
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
