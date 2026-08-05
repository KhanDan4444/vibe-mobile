import type { ThemeColors } from '@/src/theme/tokens';

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const METHOD_LABEL_KEYS: Record<string, string> = {
  Cash: 'revenue.methodCash',
  Card: 'revenue.methodCard',
  'Bank Transfer': 'revenue.methodBankTransfer',
};

/** Ionicons names for method chips. */
const METHOD_ICONS: Record<string, 'cash-outline' | 'card-outline' | 'swap-horizontal-outline' | 'wallet-outline'> = {
  Cash: 'cash-outline',
  Card: 'card-outline',
  'Bank Transfer': 'swap-horizontal-outline',
};

type MethodTone = { bg: string; text: string; border: string };

export function paymentMethodLabelKey(method: string) {
  return METHOD_LABEL_KEYS[method] ?? null;
}

export function paymentMethodIcon(method: string) {
  return METHOD_ICONS[method] ?? 'wallet-outline';
}

/**
 * Quiet neutral chip for every method — identity from the icon + label,
 * not competing color codes.
 */
export function paymentMethodBadgeStyle(_method: string, c: ThemeColors): MethodTone {
  return {
    bg: c.inputBg,
    text: c.text,
    border: c.border,
  };
}
