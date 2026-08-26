/**
 * Mirror of vibe/shared/paymentDateRules.js — keep in sync.
 * ISO YYYY-MM-DD string helpers for pickers and client validation.
 */

export function normalizeIso(date: string | null | undefined): string {
  if (!date || date === '—') return '';
  const iso = String(date).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type PaymentDateValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validatePaymentDate(
  paymentDateStr: string,
  termStartDateStr: string | null | undefined,
  today: string = todayIso()
): PaymentDateValidation {
  const paymentDate = normalizeIso(paymentDateStr);
  const termStart = normalizeIso(termStartDateStr);
  const todayNorm = normalizeIso(today) || todayIso();
  if (!paymentDate) {
    return { ok: false, error: 'Invalid payment date.' };
  }
  if (paymentDate > todayNorm) {
    return { ok: false, error: 'Payment date cannot be in the future.' };
  }
  if (termStart && paymentDate < termStart) {
    return {
      ok: false,
      error: `Payment date must be on or after the term start (${termStart}) or it will not count toward this term.`,
    };
  }
  return { ok: true };
}

/** Renew may be prepaid when the new term start is still in the future. */
export function validateRenewPaymentDate(
  paymentDateStr: string,
  termStartDateStr: string | null | undefined,
  today: string = todayIso()
): PaymentDateValidation {
  const paymentDate = normalizeIso(paymentDateStr);
  const termStart = normalizeIso(termStartDateStr);
  const todayNorm = normalizeIso(today) || todayIso();
  if (!paymentDate) {
    return { ok: false, error: 'Invalid payment date.' };
  }
  if (paymentDate > todayNorm) {
    return { ok: false, error: 'Payment date cannot be in the future.' };
  }
  if (termStart && termStart > todayNorm) {
    return { ok: true };
  }
  if (termStart && paymentDate < termStart) {
    return {
      ok: false,
      error: `Payment date must be on or after the term start (${termStart}) or it will not count toward this term.`,
    };
  }
  return { ok: true };
}

export type IsoDateBounds = { min?: string; max?: string };

export function boundsForPaymentOnTerm(termStartIso: string | null | undefined, today: string = todayIso()): IsoDateBounds {
  const term = normalizeIso(termStartIso);
  return {
    ...(term ? { min: term } : {}),
    max: normalizeIso(today) || todayIso(),
  };
}

/** When renew start is in the future, allow payment through today (prepaid). */
export function boundsForRenewPaymentOnTerm(
  termStartIso: string | null | undefined,
  today: string = todayIso()
): IsoDateBounds {
  const term = normalizeIso(termStartIso);
  const todayNorm = normalizeIso(today) || todayIso();
  if (term && term > todayNorm) {
    return { max: todayNorm };
  }
  return boundsForPaymentOnTerm(termStartIso, today);
}

export function boundsForTermStartWithPayment(today: string = todayIso()): IsoDateBounds {
  return { max: normalizeIso(today) || todayIso() };
}

export function boundsForEnrollStart(skipPayment: boolean, today: string = todayIso()): IsoDateBounds {
  return skipPayment ? {} : { max: normalizeIso(today) || todayIso() };
}

export function boundsForCustomRangeFrom(toIso: string, today: string = todayIso()): IsoDateBounds {
  const to = normalizeIso(toIso);
  return { max: to || normalizeIso(today) || todayIso() };
}

export function boundsForCustomRangeTo(fromIso: string, today: string = todayIso()): IsoDateBounds {
  const from = normalizeIso(fromIso);
  return {
    ...(from ? { min: from } : {}),
    max: normalizeIso(today) || todayIso(),
  };
}

export function clampIsoDate(iso: string, min?: string, max?: string): string {
  let result = normalizeIso(iso);
  if (!result) result = todayIso();
  const minN = normalizeIso(min);
  const maxN = normalizeIso(max);
  if (minN && maxN && minN > maxN) {
    return maxN || minN || result;
  }
  if (minN && result < minN) result = minN;
  if (maxN && result > maxN) result = maxN;
  return result;
}

export function clampPaymentToTerm(termStartIso: string, paymentIso: string, today: string = todayIso()): string {
  const bounds = boundsForPaymentOnTerm(termStartIso, today);
  return clampIsoDate(paymentIso, bounds.min, bounds.max);
}

export function clampRenewPaymentToTerm(
  termStartIso: string,
  paymentIso: string,
  today: string = todayIso()
): string {
  const bounds = boundsForRenewPaymentOnTerm(termStartIso, today);
  return clampIsoDate(paymentIso, bounds.min, bounds.max);
}

export function paymentDateForTermStart(termStartIso: string, today: string = todayIso()): string {
  return clampPaymentToTerm(termStartIso, termStartIso, today);
}

export function paymentDateForRenewTermStart(termStartIso: string, today: string = todayIso()): string {
  const term = normalizeIso(termStartIso);
  const todayNorm = normalizeIso(today) || todayIso();
  if (term && term > todayNorm) return todayNorm;
  return paymentDateForTermStart(termStartIso, today);
}
