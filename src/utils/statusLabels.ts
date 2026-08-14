/** Map API member/gym status strings to i18n keys. */
export function statusLabelKey(status: string | null | undefined): string {
  const value = (status || '').toLowerCase();
  if (value === 'active') return 'status.active';
  if (value === 'due soon') return 'status.dueSoon';
  if (value === 'expired') return 'status.expired';
  if (value === 'suspended') return 'status.suspended';
  if (value === 'trialing') return 'status.trialing';
  if (value === 'unpaid') return 'status.unpaid';
  if (value === 'former') return 'status.former';
  return 'status.unknown';
}
