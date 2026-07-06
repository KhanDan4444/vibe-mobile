const TYPE_LABELS: Record<string, string> = {
  member_due_soon: 'Due soon reminder',
  member_expires_today: 'Expires today',
  member_expired: 'Expired notice',
};

export function formatSmsType(type: string) {
  return TYPE_LABELS[type] || type || '—';
}

export const SMS_TYPE_FILTER_KEYS = [
  { value: 'all' as const, labelKey: 'messages.filterAll' },
  { value: 'member_due_soon' as const, labelKey: 'messages.filterDueSoon' },
  { value: 'member_expires_today' as const, labelKey: 'messages.filterExpiresToday' },
  { value: 'member_expired' as const, labelKey: 'messages.filterExpired' },
] as const;
