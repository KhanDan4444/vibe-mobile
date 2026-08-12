import type { ComponentProps } from 'react';
import type { TFunction } from 'i18next';
import type { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '@/src/theme/tokens';

type IonName = ComponentProps<typeof Ionicons>['name'];

const TYPE_KEYS: Record<string, string> = {
  member_enrolled: 'messages.typeEnrolled',
  member_due_soon: 'messages.typeDueSoon',
  member_expires_today: 'messages.typeExpiresToday',
  member_expired: 'messages.typeExpired',
  member_renewed: 'messages.typeRenewed',
};

const PREVIEW_KEYS: Record<string, string> = {
  member_enrolled: 'messages.previewEnrolled',
  member_due_soon: 'messages.previewDueSoon',
  member_expires_today: 'messages.previewExpiresToday',
  member_expired: 'messages.previewExpired',
  member_renewed: 'messages.previewRenewed',
};

export function formatSmsType(type: string, t: TFunction) {
  const key = TYPE_KEYS[type];
  return key ? t(key) : type || '—';
}

export function formatSmsPreview(type: string, t: TFunction) {
  const key = PREVIEW_KEYS[type];
  return key ? t(key) : '';
}

/** Accent for SMS type badges — matches member status language. */
export function smsTypeAccent(type: string, c: ThemeColors): string {
  switch (type) {
    case 'member_enrolled':
    case 'member_renewed':
      return c.statusActive;
    case 'member_due_soon':
    case 'member_expires_today':
      return c.statusDueSoon;
    case 'member_expired':
      return c.statusExpired;
    default:
      return c.statusNeutral;
  }
}

/** Type-specific glyph so the inbox scans without reading every badge. */
export function smsTypeIcon(type: string): IonName {
  switch (type) {
    case 'member_enrolled':
      return 'person-add-outline';
    case 'member_due_soon':
      return 'time-outline';
    case 'member_expires_today':
      return 'today-outline';
    case 'member_expired':
      return 'alert-circle-outline';
    case 'member_renewed':
      return 'sync-outline';
    default:
      return 'chatbubble-ellipses-outline';
  }
}

export const SMS_TYPE_FILTER_KEYS = [
  { value: 'all' as const, labelKey: 'messages.filterAll' },
  { value: 'member_enrolled' as const, labelKey: 'messages.filterEnrolled' },
  { value: 'member_due_soon' as const, labelKey: 'messages.filterDueSoon' },
  { value: 'member_expires_today' as const, labelKey: 'messages.filterExpiresToday' },
  { value: 'member_expired' as const, labelKey: 'messages.filterExpired' },
  { value: 'member_renewed' as const, labelKey: 'messages.filterRenewed' },
] as const;
