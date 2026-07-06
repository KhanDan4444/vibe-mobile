import { formatDisplayDate, todayString, toDateString } from '@/src/utils/date';

export function formatApiError(message: string): string {
  return message.replace(/^[a-zA-Z_.]+:\s*/, '');
}

export function validateChangePlanPaymentFields({
  termStart,
  paymentDate,
  amount,
  isSameTerm,
}: {
  termStart: string;
  paymentDate: string;
  amount: number;
  isSameTerm: boolean;
}): { key: string; values?: Record<string, string> } | null {
  const term = toDateString(termStart);
  const pay = toDateString(paymentDate);
  const today = todayString();

  if (!term || !pay) {
    return { key: 'validation.selectPlanAndDates' };
  }
  if (!isSameTerm && amount <= 0) {
    return { key: 'validation.paymentForTermStart' };
  }
  if (pay < term) {
    return {
      key: 'validation.paymentDateBeforeTermStart',
      values: { date: formatDisplayDate(term) },
    };
  }
  if (pay > today) {
    return { key: 'validation.paymentDateFuture' };
  }
  return null;
}

export function isoToLocalDate(iso: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (parts) return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return new Date();
}
