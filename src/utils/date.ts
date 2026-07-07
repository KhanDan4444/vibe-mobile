export function toDateString(date: string | Date | null | undefined): string {
  if (!date) return '';
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

export function formatDisplayDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return formatDisplayDate(date);
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
