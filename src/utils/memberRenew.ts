import { addDays, todayString } from '@/src/utils/date';
import type { MemberRow } from '@/src/types/api';

type RenewableMember = {
  status?: string;
  is_unpaid?: boolean;
  end_date?: string | null;
  endDate?: string | null;
};

export function defaultRenewStartDate(member: Pick<MemberRow, 'is_unpaid' | 'end_date'>): string {
  const today = todayString();
  if (member.is_unpaid) return today;
  const end = String(member.end_date || '').split('T')[0];
  if (!end) return today;
  const afterEnd = addDays(end, 1);
  return afterEnd > today ? afterEnd : today;
}

/** Renew on the end date or after expiry (not earlier in the due-soon window). */
export function canRenewMember(member: RenewableMember): boolean {
  if (member.is_unpaid) return false;
  const raw = member.end_date ?? member.endDate;
  if (!raw) return false;
  const endDay = String(raw).split('T')[0];
  return endDay <= todayString();
}

export function canCollectPayment(member: Pick<MemberRow, 'is_unpaid'>): boolean {
  return Boolean(member.is_unpaid);
}

export function canChangePlan(member: Pick<MemberRow, 'status'>): boolean {
  return (member.status || '').toLowerCase() === 'active';
}
