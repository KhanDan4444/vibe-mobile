import { toDateString, todayString } from '@/src/utils/date';
import type { MemberRow, PlanRow } from '@/src/types/api';

function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateEndDate(startDateStr: string, duration: number | string): string {
  const start = parseLocalDate(startDateStr);
  if (!start) return '—';

  const months = parseInt(String(duration), 10);
  if (!Number.isNaN(months)) {
    start.setMonth(start.getMonth() + months);
  } else if (typeof duration === 'string') {
    const normalized = duration.trim();
    if (normalized === 'Monthly') start.setMonth(start.getMonth() + 1);
    else if (normalized === 'Quarterly') start.setMonth(start.getMonth() + 3);
    else if (normalized === '6-month') start.setMonth(start.getMonth() + 6);
    else if (normalized === 'Yearly') start.setFullYear(start.getFullYear() + 1);
  }

  return formatLocalDate(start);
}

function daysBetween(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export function isMemberPlanDowngrade(currentPlan: PlanRow | null, newPlan: PlanRow | null): boolean {
  if (!currentPlan || !newPlan) return false;
  return Number(newPlan.price) <= Number(currentPlan.price);
}

export function suggestChangePlanAmount(
  member: MemberRow | null,
  currentPlan: PlanRow | null,
  newPlan: PlanRow | null,
  options: { customTermStart?: boolean; startDate?: string } = {}
) {
  if (!member || !currentPlan || !newPlan) return null;

  const newPrice = Number(newPlan.price);
  if (!Number.isFinite(newPrice)) return null;

  const { customTermStart = false, startDate } = options;
  const termStart = toDateString(member.start_date);

  if (member.is_unpaid) {
    return {
      suggestedAmount: Math.round(newPrice * 100) / 100,
      credit: 0,
      isDowngrade: false,
      prePayment: true,
    };
  }

  if (customTermStart && termStart && startDate && startDate !== termStart) {
    return {
      suggestedAmount: Math.round(newPrice * 100) / 100,
      credit: 0,
      isDowngrade: Number(newPlan.price) <= Number(currentPlan.price),
      freshTerm: true,
    };
  }

  const currentPrice = Number(currentPlan.price);
  if (!Number.isFinite(currentPrice)) return null;

  const termEnd = toDateString(member.end_date);
  const today = todayString();
  if (!termStart || !termEnd) return null;

  const totalDays = daysBetween(termStart, termEnd);
  if (totalDays <= 0) return null;

  const remainingDays = Math.min(daysBetween(today, termEnd), totalDays);
  const isDowngrade = newPrice <= currentPrice;

  if (isDowngrade) {
    return { suggestedAmount: 0, credit: 0, isDowngrade: true };
  }

  const rawCredit = currentPrice * (remainingDays / totalDays);
  const credit = Math.min(rawCredit, Math.max(0, newPrice - 0.01));
  const suggestedAmount = Math.max(0.01, Math.round((newPrice - credit) * 100) / 100);

  return { suggestedAmount, credit: Math.round(credit * 100) / 100, isDowngrade: false };
}

export function previewMemberTermEnd({
  member,
  currentPlan,
  selectedPlan,
  customTermStart,
  startDate,
}: {
  member: MemberRow | null;
  currentPlan: PlanRow | null;
  selectedPlan: PlanRow | null;
  customTermStart: boolean;
  startDate: string;
}): string | null {
  const termStart = toDateString(member?.start_date);
  const termEnd = toDateString(member?.end_date);
  const effectiveStart = customTermStart ? startDate : termStart;
  if (!selectedPlan || !effectiveStart) return null;

  const sameTerm = !customTermStart && effectiveStart === termStart;
  if (
    sameTerm &&
    member &&
    !member.is_unpaid &&
    isMemberPlanDowngrade(currentPlan, selectedPlan) &&
    termEnd
  ) {
    return termEnd;
  }

  return calculateEndDate(effectiveStart, selectedPlan.duration);
}
