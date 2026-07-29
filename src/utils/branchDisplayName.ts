import i18n from '@/src/i18n';

/** Localize well-known seeded branch names without changing stored data. */
export function branchDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  if (name.trim().toLowerCase() === 'main' && i18n.resolvedLanguage === 'am') {
    return i18n.t('branch.mainName');
  }
  return name;
}
