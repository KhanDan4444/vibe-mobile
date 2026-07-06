import i18n from '@/src/i18n';
import type { DashboardNotification } from '@/src/types/api';

export type NotificationAction = 'renew' | 'payment';

export function notificationAction(item: DashboardNotification): NotificationAction | null {
  if (!item.memberId) return null;
  if (item.suggestedAction === 'renew' || item.suggestedAction === 'payment') {
    return item.suggestedAction;
  }
  if (item.kind === 'unpaid') return 'payment';
  if (item.kind === 'due_soon' || item.kind === 'expired') return 'renew';
  return null;
}

export function notificationActionLabel(action: NotificationAction) {
  return action === 'renew' ? i18n.t('notifications.renew') : i18n.t('notifications.collectPayment');
}

export function notificationActionRoute(action: NotificationAction, memberId: number) {
  return action === 'renew' ? `/renew/${memberId}` : `/payment/${memberId}`;
}
