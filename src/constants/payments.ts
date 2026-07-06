import type { ThemeColors } from '@/src/theme/tokens';

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Badge colors aligned with the indigo + slate theme (accent, filters, cards). */
export function paymentMethodBadgeStyle(method: string, c: ThemeColors) {
  if (method === 'Card') return { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc' };
  if (method === 'Bank Transfer') return { bg: 'rgba(56,189,248,0.15)', text: '#7dd3fc' };
  if (method === 'Cash') return { bg: 'rgba(51, 65, 85, 0.65)', text: '#e2e8f0' };
  return { bg: 'rgba(148,163,184,0.12)', text: c.muted };
}
