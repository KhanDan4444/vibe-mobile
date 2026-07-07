import { clampIsoDate, isoToLocalDate, todayString, toDateString } from '@/src/utils/date';
import { defaultRenewStartDate } from '@/src/utils/memberRenew';
import type { MemberRow } from '@/src/types/api';

export type DateBounds = {
  minimumDate?: Date;
  maximumDate?: Date;
};

export function todayAsDate(): Date {
  return isoToLocalDate(todayString());
}

/** Payment collected on/after term start, never in the future. */
export function boundsForPaymentOnTerm(termStartIso: string | null | undefined): DateBounds {
  const term = toDateString(termStartIso);
  return {
    minimumDate: term ? isoToLocalDate(term) : undefined,
    maximumDate: todayAsDate(),
  };
}

/** New term / membership start when payment is recorded the same flow (today or earlier). */
export function boundsForTermStartWithPayment(): DateBounds {
  return { maximumDate: todayAsDate() };
}

/** Enroll membership start — future allowed only when skipping payment. */
export function boundsForEnrollStart(skipPayment: boolean): DateBounds {
  return skipPayment ? {} : { maximumDate: todayAsDate() };
}

/** Renewal term start — earliest allowed date from paid-through logic; may be in the future. */
export function boundsForRenewStart(member: Pick<MemberRow, 'is_unpaid' | 'end_date'>): DateBounds {
  return { minimumDate: isoToLocalDate(defaultRenewStartDate(member)) };
}

/** Revenue / report custom range pickers. */
export function boundsForCustomRangeFrom(toIso: string): DateBounds {
  const to = toDateString(toIso);
  return {
    maximumDate: to ? isoToLocalDate(to) : todayAsDate(),
  };
}

export function boundsForCustomRangeTo(fromIso: string): DateBounds {
  const from = toDateString(fromIso);
  return {
    minimumDate: from ? isoToLocalDate(from) : undefined,
    maximumDate: todayAsDate(),
  };
}

/** After term start changes, keep payment inside [term start, today]. */
export function clampPaymentToTerm(termStartIso: string, paymentIso: string): string {
  const term = toDateString(termStartIso);
  if (!term) return clampIsoDate(paymentIso, undefined, todayAsDate());
  return clampIsoDate(paymentIso, isoToLocalDate(term), todayAsDate());
}

/** Payment follows term start (change plan / fresh term), capped at today. */
export function paymentDateForTermStart(termStartIso: string): string {
  return clampPaymentToTerm(termStartIso, termStartIso);
}
