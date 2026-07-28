import type { ThemeColors } from '@/src/theme/tokens';

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const METHOD_LABEL_KEYS: Record<string, string> = {
  Cash: 'revenue.methodCash',
  Card: 'revenue.methodCard',
  'Bank Transfer': 'revenue.methodBankTransfer',
};

export function paymentMethodLabelKey(method: string) {
  return METHOD_LABEL_KEYS[method] ?? null;
}

/** Quiet outline for all methods — color lives on Source, not Method. */
export function paymentMethodBadgeStyle(_method: string, c: ThemeColors) {
  return { bg: c.inputBg, text: c.muted };
}
