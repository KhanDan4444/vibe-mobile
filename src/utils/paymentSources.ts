import i18n from '@/src/i18n';
import { lightMetaColor } from '@/src/theme/tokens';
import { paymentSourceKey } from '@/src/utils/termPayments';

/** Localized payment source label (API values stay English). */
export function paymentSourceLabel(source?: string | null) {
  if (!source) return i18n.t('forms.paymentSourceCollect');
  return i18n.t(paymentSourceKey(source));
}

/** Quiet muted tone for all sources — text carries meaning, not color. */
export function paymentSourceColor(_source?: string | null) {
  return lightMetaColor;
}
