import { toDateString } from '@/src/utils/date';
import type { PaymentRow } from '@/src/types/api';

/** Payments on or after the member's current term start (matches backend term logic). */
export function paymentsForCurrentTerm(
  payments: PaymentRow[] | undefined,
  termStart: string | null | undefined
): PaymentRow[] {
  const start = toDateString(termStart);
  if (!start || !payments?.length) return [];
  return payments
    .filter((p) => {
      const d = toDateString(p.date);
      return d && d >= start;
    })
    .sort((a, b) => toDateString(a.date).localeCompare(toDateString(b.date)));
}

export function sumPaymentAmounts(payments: PaymentRow[]): number {
  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

export function paymentSourceKey(source: string | undefined): string {
  const s = (source || 'collect').toLowerCase();
  if (s === 'enroll') return 'forms.paymentSourceEnroll';
  if (s === 'renew') return 'forms.paymentSourceRenew';
  if (s === 'change_plan') return 'forms.paymentSourceChangePlan';
  if (s === 'trainer') return 'forms.paymentSourceTrainer';
  return 'forms.paymentSourceCollect';
}
