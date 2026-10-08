/**
 * Owner/staff license badge label for Account.
 * Free Trial stays as-is; paid licenses become "Monthly Plan", "Quarterly Plan", etc.
 */
export function formatLicensePlanBadge(
  licensePlanName: string | null | undefined,
  opts: { isTrial?: boolean; durationMonths?: number | null } | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string
): string | null {
  const isTrial = Boolean(opts?.isTrial);
  const duration = opts?.durationMonths != null ? Number(opts.durationMonths) : NaN;
  const name = String(licensePlanName || '').trim();

  if (isTrial || /^free\s*trial$/i.test(name)) {
    return t('profile.planBadgeFreeTrial');
  }
  if (!name && !Number.isFinite(duration)) return null;

  const lower = name.toLowerCase();
  if (/\bmonthly\b/.test(lower) || duration === 1) {
    return t('profile.planBadgeMonthly');
  }
  if (/\bquarterly\b/.test(lower) || duration === 3) {
    return t('profile.planBadgeQuarterly');
  }
  if (/\b6[- ]?month\b|\bsemi[- ]?annual\b/.test(lower) || duration === 6) {
    return t('profile.planBadgeSixMonth');
  }
  if (/\byearly\b|\bannual\b|\byear\b/.test(lower) || duration === 12) {
    return t('profile.planBadgeYearly');
  }
  if (Number.isFinite(duration) && duration > 0) {
    return t('profile.planBadgeMonths', { count: duration });
  }
  if (/\bplan\s*$/i.test(name)) {
    return name.replace(/\s+/g, ' ').replace(/\bplan\s*$/i, 'Plan');
  }
  return t('profile.planBadgeNamed', { name });
}
