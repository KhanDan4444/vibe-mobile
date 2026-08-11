/**
 * Format API trend strings for UI.
 * Huge swings usually mean a thin prior baseline (e.g. prior ≈ 0 → "+868%") — don't shout them beside a hero total.
 */
export function formatTrendForDisplay(
  trend: string | number | null | undefined,
  { shoutMaxAbs = 100 }: { shoutMaxAbs?: number } = {},
): { label: string | null; extreme: boolean } {
  if (trend == null || trend === '') {
    return { label: null, extreme: false };
  }
  const raw = String(trend).trim();
  if (!raw) return { label: null, extreme: false };

  const n = Number(raw.replace(/%/g, '').replace(/\+/g, '').replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    return { label: raw, extreme: false };
  }
  if (Math.abs(n) >= shoutMaxAbs) {
    return { label: null, extreme: true };
  }
  const sign = n > 0 ? '+' : '';
  return { label: `${sign}${n}%`, extreme: false };
}

/** i18n key for the comparison caption matching the selected revenue period. */
export function trendCaptionKeyForPreset(preset: string): string {
  switch (preset) {
    case 'today':
      return 'revenue.trendVs.today';
    case 'this_week':
      return 'revenue.trendVs.thisWeek';
    case 'this_month':
      return 'revenue.trendVs.thisMonth';
    case 'last_month':
      return 'revenue.trendVs.lastMonth';
    case 'last_30_days':
      return 'revenue.trendVs.last30Days';
    case 'this_year':
      return 'revenue.trendVs.thisYear';
    case 'custom':
      return 'revenue.trendVs.custom';
    default:
      return 'revenue.trendVs.thisMonth';
  }
}

/** Clearer copy when prior period data is too thin to compare. */
export function trendThinBaselineKeyForPreset(preset: string): string {
  switch (preset) {
    case 'today':
      return 'revenue.trendThin.today';
    case 'this_week':
      return 'revenue.trendThin.thisWeek';
    case 'this_month':
      return 'revenue.trendThin.thisMonth';
    case 'last_month':
      return 'revenue.trendThin.lastMonth';
    case 'last_30_days':
      return 'revenue.trendThin.last30Days';
    case 'this_year':
      return 'revenue.trendThin.thisYear';
    case 'custom':
      return 'revenue.trendThin.custom';
    default:
      return 'revenue.trendThin.fallback';
  }
}
