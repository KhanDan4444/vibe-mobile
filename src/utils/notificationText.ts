import type { TFunction } from 'i18next';
import type { DashboardNotification } from '@/src/types/api';
import { formatFriendlyDate, formatRelativeDay } from '@/src/utils/date';
import { formatEtb } from '@/src/utils/formatMoney';
import { formatPlanDisplayName } from '@/src/utils/planFormat';

export type NotificationKind = 'unpaid' | 'due_soon' | 'expired' | 'payment_recorded' | null;
export type NotificationSection = 'attention' | 'activity';

export type LocalizedNotification = {
  kind: NotificationKind;
  section: NotificationSection;
  memberName: string | null;
  eyebrow: string;
  title: string;
  message: string;
  date: string;
};

export function notificationKind(notification: DashboardNotification): NotificationKind {
  if (notification.kind === 'unpaid' || notification.kind === 'due_soon' || notification.kind === 'expired' || notification.kind === 'payment_recorded') {
    return notification.kind;
  }
  const prefix = String(notification.id || '').split('-')[0];
  if (prefix === 'unpaid') return 'unpaid';
  if (prefix === 'due') return 'due_soon';
  if (prefix === 'exp') return 'expired';
  if (prefix === 'pay') return 'payment_recorded';
  return null;
}

export function notificationSection(notification: DashboardNotification): NotificationSection {
  const kind = notificationKind(notification);
  if (kind === 'payment_recorded' || notification.type === 'info') return 'activity';
  if (kind === 'unpaid' || kind === 'due_soon' || kind === 'expired') return 'attention';
  if (notification.type === 'warning' || notification.type === 'danger') return 'attention';
  return 'activity';
}

export function groupNotifications(notifications: DashboardNotification[]) {
  const attention: DashboardNotification[] = [];
  const activity: DashboardNotification[] = [];
  for (const item of notifications) {
    if (notificationSection(item) === 'attention') attention.push(item);
    else activity.push(item);
  }
  return { attention, activity };
}

export type NotificationStack = {
  key: string;
  kind: NotificationKind;
  items: DashboardNotification[];
};

/** Collapse unpaid / due soon / expired into expandable stacks when 2+. */
export function stackNotificationGroups(items: DashboardNotification[]): NotificationStack[] {
  const order: string[] = [];
  const buckets = new Map<string, DashboardNotification[]>();
  for (const item of items) {
    const kind = notificationKind(item);
    const stackable = kind === 'unpaid' || kind === 'due_soon' || kind === 'expired';
    const key = stackable && kind ? kind : `one:${item.id}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }
  return order.map((key) => {
    const groupItems = buckets.get(key)!;
    return { key, kind: notificationKind(groupItems[0]), items: groupItems };
  });
}

export function stackTitle(kind: NotificationKind, count: number, t: TFunction) {
  if (kind === 'unpaid') return t('notifications.stack.unpaid', { count });
  if (kind === 'due_soon') return t('notifications.stack.dueSoon', { count });
  if (kind === 'expired') return t('notifications.stack.expired', { count });
  return '';
}

export function stackPreview(items: DashboardNotification[], t: TFunction) {
  const names = items
    .map((item) => parseMemberName(item, notificationKind(item)))
    .filter(Boolean) as string[];
  if (names.length <= 2) return names.join(', ');
  return t('notifications.stack.namesMore', {
    names: names.slice(0, 2).join(', '),
    count: names.length - 2,
  });
}

function parseMemberName(notification: DashboardNotification, kind: NotificationKind): string | null {
  if (notification.memberName) return notification.memberName;
  const msg = notification.message || '';
  if (kind === 'payment_recorded') {
    const match = msg.match(/from (.+?)\.\s*$/) || msg.match(/for (.+?)\.\s*$/);
    return match?.[1] || null;
  }
  const match = msg.match(/^(?:\[[^\]]+\]\s*)?(.+?)(?:'s| was)/);
  return match?.[1] || null;
}

function parsePlanName(notification: DashboardNotification): string | null {
  if (notification.planName) return notification.planName;
  const msg = notification.message || '';
  const match = msg.match(/'s (.+?) (?:expires|expired)/);
  return match?.[1] || null;
}

function parseEndDate(notification: DashboardNotification): string | null {
  if (notification.endDate) return notification.endDate;
  const msg = notification.message || '';
  const match = msg.match(/(?:on|expires in less than 3 days \(on )([^).]+)\)?/);
  return match?.[1]?.trim() || null;
}

function parseAmount(notification: DashboardNotification): number | null {
  if (notification.amount != null && !Number.isNaN(Number(notification.amount))) {
    return Number(notification.amount);
  }
  const msg = notification.message || '';
  const match = msg.match(/\$([0-9]+(?:\.[0-9]{2})?)/) || msg.match(/([0-9]+(?:\.[0-9]{2})?)\s*ETB/i);
  return match ? Number(match[1]) : null;
}

/** Drop leading `[Branch] ` from API/raw messages (legacy). */
export function stripBranchBracketPrefix(message: string | null | undefined): string {
  return String(message || '').replace(/^\[[^\]]+\]\s*/, '');
}

function langFromT(t: TFunction) {
  return t.i18n?.language || 'en';
}

function inboxDate(t: TFunction, raw?: string | null) {
  if (!raw || raw === 'Action needed' || raw === 'System Alert') return '';
  return formatRelativeDay(raw, t, langFromT(t)) || formatFriendlyDate(raw, langFromT(t));
}

function planLabel(t: TFunction, notification: DashboardNotification) {
  return formatPlanDisplayName(parsePlanName(notification)) || t('notifications.defaultPlan');
}

export function localizeNotification(notification: DashboardNotification, t: TFunction): LocalizedNotification {
  const kind = notificationKind(notification);
  const memberName = parseMemberName(notification, kind);
  const section = notificationSection(notification);
  const date = inboxDate(t, notification.date);

  if (kind === 'unpaid' && memberName) {
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.unpaid'),
      title: memberName,
      message: t('notifications.items.unpaid.message'),
      date,
    };
  }

  if (kind === 'due_soon' && memberName) {
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.dueSoon'),
      title: memberName,
      message: t('notifications.items.dueSoon.message', {
        plan: planLabel(t, notification),
      }),
      date: inboxDate(t, parseEndDate(notification)),
    };
  }

  if (kind === 'expired' && memberName) {
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.expired'),
      title: memberName,
      message: t('notifications.items.expired.message', {
        plan: planLabel(t, notification),
      }),
      date: inboxDate(t, parseEndDate(notification)),
    };
  }

  if (kind === 'payment_recorded' && memberName) {
    const amount = parseAmount(notification);
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.paymentRecorded'),
      title: memberName,
      message: t('notifications.items.paymentRecorded.message', {
        amount: amount != null ? formatEtb(amount) : '',
      }),
      date,
    };
  }

  return {
    kind,
    section,
    memberName,
    eyebrow: '',
    title: notification.title,
    message: stripBranchBracketPrefix(notification.message),
    date,
  };
}
