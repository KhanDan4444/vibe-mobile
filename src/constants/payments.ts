import type { ThemeColors } from '@/src/theme/tokens';

/** Canonical order — matches web (Tele Birr before Card). */
export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Tele Birr', 'Card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Alias for sorting / legends — same order as {@link PAYMENT_METHODS}. */
export const PAYMENT_METHOD_ORDER = PAYMENT_METHODS;

const METHOD_LABEL_KEYS: Record<string, string> = {
  Cash: 'revenue.methodCash',
  Card: 'revenue.methodCard',
  'Bank Transfer': 'revenue.methodBankTransfer',
  'Tele Birr': 'revenue.methodTeleBirr',
};

/** Compact labels for tight hero method columns (Amharic-friendly). */
const METHOD_SHORT_LABEL_KEYS: Record<string, string> = {
  Cash: 'revenue.methodCashShort',
  Card: 'revenue.methodCardShort',
  'Bank Transfer': 'revenue.methodBankTransferShort',
  'Tele Birr': 'revenue.methodTeleBirrShort',
};

/** Ionicons names for method chips. */
const METHOD_ICONS: Record<
  string,
  'cash-outline' | 'card-outline' | 'swap-horizontal-outline' | 'phone-portrait-outline' | 'wallet-outline'
> = {
  Cash: 'cash-outline',
  Card: 'card-outline',
  'Bank Transfer': 'swap-horizontal-outline',
  'Tele Birr': 'phone-portrait-outline',
};

type MethodTone = { bg: string; text: string; border: string };

export function paymentMethodLabelKey(method: string) {
  return METHOD_LABEL_KEYS[method] ?? null;
}

export function paymentMethodShortLabelKey(method: string) {
  return METHOD_SHORT_LABEL_KEYS[method] ?? paymentMethodLabelKey(method);
}

export function paymentMethodIcon(method: string) {
  return METHOD_ICONS[method] ?? 'wallet-outline';
}

export function comparePaymentMethodOrder(a: string, b: string) {
  const ai = PAYMENT_METHOD_ORDER.indexOf(a as PaymentMethod);
  const bi = PAYMENT_METHOD_ORDER.indexOf(b as PaymentMethod);
  const aRank = ai === -1 ? PAYMENT_METHOD_ORDER.length : ai;
  const bRank = bi === -1 ? PAYMENT_METHOD_ORDER.length : bi;
  return aRank - bRank;
}

/** Quiet chip — method identity via icon + label, not color coding. */
export function paymentMethodBadgeStyle(_method: string, c: ThemeColors): MethodTone {
  return { bg: c.inputBg, text: c.muted, border: c.border };
}
