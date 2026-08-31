/** Default weekly visit cap (formerly labeled "Unlimited" — one visit per day). */
export const WEEKLY_VISIT_CAP_DEFAULT = 7;

export function effectiveVisitsPerWeek(visitsPerWeek: number | null | undefined): number {
  return visitsPerWeek ?? WEEKLY_VISIT_CAP_DEFAULT;
}

export function effectiveVisitsLimit(
  visitsLimit: number | null | undefined,
  visitsPerWeek?: number | null
): number {
  if (visitsLimit != null && Number.isFinite(visitsLimit)) return visitsLimit;
  return effectiveVisitsPerWeek(visitsPerWeek);
}
