/** Show urgent “n days left” styling at or under this threshold. */
export const TRIAL_DAYS_LEFT_URGENCY = 7;

function toDateString(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(date).split('T')[0] || null;
}

function parseLocalDay(date: string | Date | null | undefined): Date | null {
  const iso = toDateString(date);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const MS_DAY = 86400000;

export function getTrialProgress(args: {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  today?: Date;
}): {
  totalDays: number;
  daysUsed: number;
  daysLeft: number;
  startDate: string;
  endDate: string;
} | null {
  const start = parseLocalDay(args.startDate);
  const end = parseLocalDay(args.endDate);
  const todayDay = parseLocalDay(toDateString(args.today ?? new Date()));
  if (!start || !end || !todayDay) return null;

  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_DAY) + 1;
  if (totalDays < 1) return null;

  const rawUsed = Math.round((todayDay.getTime() - start.getTime()) / MS_DAY) + 1;
  const daysUsed = Math.min(totalDays, Math.max(0, rawUsed));
  const daysLeft = Math.round((end.getTime() - todayDay.getTime()) / MS_DAY);
  const startIso = toDateString(args.startDate);
  const endIso = toDateString(args.endDate);
  if (!startIso || !endIso) return null;

  return { totalDays, daysUsed, daysLeft, startDate: startIso, endDate: endIso };
}
