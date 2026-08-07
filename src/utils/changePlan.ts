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

/** Inclusive term end — mirrors web/backend (next period start minus one day). */
function addMonthsAsInclusiveEnd(start: Date, months: number): Date {
  const targetMonth = start.getMonth() + months;
  const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, normalizedTargetMonth + 1, 0).getDate();
  const nextStart =
    start.getDate() <= daysInTargetMonth
      ? new Date(targetYear, normalizedTargetMonth, start.getDate())
      : new Date(targetYear, normalizedTargetMonth + 1, 1);

  nextStart.setDate(nextStart.getDate() - 1);
  return nextStart;
}

/** Mirror backend/web calculateEndDate — preview term end in forms. */
export function calculateEndDate(startDateStr: string, duration: number | string): string {
  const start = parseLocalDate(startDateStr);
  if (!start) return '—';

  const months = parseInt(String(duration), 10);
  if (!Number.isNaN(months)) {
    return formatLocalDate(addMonthsAsInclusiveEnd(start, months));
  }
  if (typeof duration === 'string') {
    const normalized = duration.trim();
    if (normalized === 'Monthly') return formatLocalDate(addMonthsAsInclusiveEnd(start, 1));
    if (normalized === 'Quarterly') return formatLocalDate(addMonthsAsInclusiveEnd(start, 3));
    if (normalized === '6-month') return formatLocalDate(addMonthsAsInclusiveEnd(start, 6));
    if (normalized === 'Yearly') return formatLocalDate(addMonthsAsInclusiveEnd(start, 12));
  }

  return formatLocalDate(start);
}

function daysBetween(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export type ChangePlanAmountHint = {
  suggestedAmount: number;
  credit: number;
  remainingDays: number;
  totalDays: number;
  newPlanPrice: number;
  isDowngrade: boolean;
  prePayment?: boolean;
  freshTerm?: boolean;
  keepTermEnd?: boolean;
};

export function isMemberPlanDowngrade(currentPlan: PlanRow | null, newPlan: PlanRow | null): boolean {
  if (!currentPlan || !newPlan) return false;
  return Number(newPlan.price) <= Number(currentPlan.price);
}

/** Suggested change-plan payment — mirrors web memberRenew.suggestChangePlanAmount. */
export function suggestChangePlanAmount(
  member: MemberRow | null,
  currentPlan: PlanRow | null,
  newPlan: PlanRow | null,
  options: { customTermStart?: boolean; startDate?: string } = {}
): ChangePlanAmountHint | null {
  if (!member || !currentPlan || !newPlan) return null;

  const newPrice = Number(newPlan.price);
  if (!Number.isFinite(newPrice)) return null;

  const { customTermStart = false, startDate } = options;
  const termStart = toDateString(member.start_date);

  if (member.is_unpaid) {
    return {
      suggestedAmount: Math.round(newPrice * 100) / 100,
      credit: 0,
      remainingDays: 0,
      totalDays: 0,
      newPlanPrice: newPrice,
      isDowngrade: false,
      prePayment: true,
    };
  }

  if (customTermStart && termStart && startDate && startDate !== termStart) {
    return {
      suggestedAmount: Math.round(newPrice * 100) / 100,
      credit: 0,
      remainingDays: 0,
      totalDays: 0,
      newPlanPrice: newPrice,
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
    return {
      suggestedAmount: 0,
      credit: 0,
      remainingDays,
      totalDays,
      newPlanPrice: newPrice,
      isDowngrade: true,
      keepTermEnd: true,
    };
  }

  const rawCredit = currentPrice * (remainingDays / totalDays);
  const credit = Math.min(rawCredit, Math.max(0, newPrice - 0.01));
  const suggestedAmount = Math.max(0.01, Math.round((newPrice - credit) * 100) / 100);

  return {
    suggestedAmount,
    credit: Math.round(credit * 100) / 100,
    remainingDays,
    totalDays,
    newPlanPrice: newPrice,
    isDowngrade: false,
  };
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
