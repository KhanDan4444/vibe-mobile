import i18n from '@/src/i18n';
import type { DashboardNotification } from '@/src/types/api';
import { todayString } from '@/src/utils/date';

export type NotificationAction = 'renew' | 'payment' | 'view';

export function notificationAction(item: DashboardNotification): NotificationAction | null {
  if (!item.memberId) return null;
  if (item.suggestedAction === 'renew' || item.suggestedAction === 'payment' || item.suggestedAction === 'view') {
    return item.suggestedAction;
  }
  if (item.kind === 'unpaid') return 'payment';
  if (item.kind === 'expired') return 'renew';
  if (item.kind === 'due_soon') {
    const end = String(item.endDate || '').split('T')[0];
    return end && end <= todayString() ? 'renew' : 'view';
  }
  // Payment recorded / info alerts — same as web "View member"
  if (item.type === 'info' || item.kind === 'payment_recorded') return 'view';
  return null;
}

export function notificationActionLabel(action: NotificationAction) {
  if (action === 'renew') return i18n.t('notifications.renew');
  if (action === 'payment') return i18n.t('notifications.collectPayment');
  return i18n.t('notifications.viewMember');
}

export function notificationActionRoute(action: NotificationAction, memberId: number) {
  if (action === 'renew') return `/renew/${memberId}`;
  if (action === 'payment') return `/payment/${memberId}`;
  return `/member/${memberId}`;
}

/** Button fill — Collect payment matches web amber; renew/view keep teal. */
export function notificationActionColor(action: NotificationAction, c: { accent: string; warning: string }) {
  if (action === 'payment') return c.warning;
  return c.accent;
}
