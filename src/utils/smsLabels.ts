import type { TFunction } from 'i18next';

const TYPE_KEYS: Record<string, string> = {
  member_due_soon: 'messages.typeDueSoon',
  member_expires_today: 'messages.typeExpiresToday',
  member_expired: 'messages.typeExpired',
};

export function formatSmsType(type: string, t: TFunction) {
  const key = TYPE_KEYS[type];
  return key ? t(key) : type || '—';
}

export const SMS_TYPE_FILTER_KEYS = [
  { value: 'all' as const, labelKey: 'messages.filterAll' },
  { value: 'member_due_soon' as const, labelKey: 'messages.filterDueSoon' },
  { value: 'member_expires_today' as const, labelKey: 'messages.filterExpiresToday' },
  { value: 'member_expired' as const, labelKey: 'messages.filterExpired' },
] as const;
