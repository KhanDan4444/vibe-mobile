import { isoToLocalDate, toDateString } from '@/src/utils/date';
import { defaultRenewStartDate } from '@/src/utils/memberRenew';
import type { MemberRow } from '@/src/types/api';
import {
  boundsForCustomRangeFrom as coreFrom,
  boundsForCustomRangeTo as coreTo,
  boundsForEnrollStart as coreEnroll,
  boundsForPaymentOnTerm as corePayment,
  boundsForRenewPaymentOnTerm as coreRenewPayment,
  boundsForTermStartWithPayment as coreTermStart,
  clampPaymentToTerm as coreClamp,
  clampRenewPaymentToTerm as coreRenewClamp,
  paymentDateForTermStart as corePaymentForTerm,
  paymentDateForRenewTermStart as coreRenewPaymentForTerm,
} from '@/src/utils/paymentDateRules';

export type DateBounds = {
  minimumDate?: Date;
  maximumDate?: Date;
};

function toDateBounds(bounds: { min?: string; max?: string }): DateBounds {
  return {
    ...(bounds.min ? { minimumDate: isoToLocalDate(bounds.min) } : {}),
    // End-of-day max so Android DateTimePicker does not treat "today 00:00" as already past.
    ...(bounds.max ? { maximumDate: endOfLocalDay(bounds.max) } : {}),
  };
}

function endOfLocalDay(iso: string): Date {
  const d = isoToLocalDate(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Payment collected on/after term start, never in the future. */
export function boundsForPaymentOnTerm(termStartIso: string | null | undefined): DateBounds {
  return toDateBounds(corePayment(termStartIso));
}

/** Renew: allow prepaid payment when start is still in the future. */
export function boundsForRenewPaymentOnTerm(termStartIso: string | null | undefined): DateBounds {
  return toDateBounds(coreRenewPayment(termStartIso));
}

export function boundsForTermStartWithPayment(): DateBounds {
  return toDateBounds(coreTermStart());
}

export function boundsForEnrollStart(skipPayment: boolean): DateBounds {
  return toDateBounds(coreEnroll(skipPayment));
}

export function boundsForRenewStart(member: Pick<MemberRow, 'is_unpaid' | 'end_date'>): DateBounds {
  const min = defaultRenewStartDate(member);
  return { minimumDate: isoToLocalDate(min) };
}

export function boundsForCustomRangeFrom(toIso: string): DateBounds {
  return toDateBounds(coreFrom(toIso));
}

export function boundsForCustomRangeTo(fromIso: string): DateBounds {
  return toDateBounds(coreTo(fromIso));
}

export function clampPaymentToTerm(termStartIso: string, paymentIso: string): string {
  return coreClamp(termStartIso, paymentIso);
}

export function clampRenewPaymentToTerm(termStartIso: string, paymentIso: string): string {
  return coreRenewClamp(termStartIso, paymentIso);
}

export function paymentDateForTermStart(termStartIso: string): string {
  return corePaymentForTerm(termStartIso);
}

export function paymentDateForRenewTermStart(termStartIso: string): string {
  return coreRenewPaymentForTerm(termStartIso);
}

export { toDateString };
