export const CURRENCY_CODE = 'ETB';

/** Compact number for tight chart labels (e.g. 1.2M, 85K). */
export function formatCompactNumber(amount: number): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const scaled = n / 1_000_000;
    return `${scaled >= 10 ? Math.round(scaled) : scaled.toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    const scaled = n / 1_000;
    return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1)}K`;
  }
  return n.toLocaleString();
}

/** ETB display — auto-compacts large totals so they fit on screen. */
export function formatEtb(amount: number, options?: { forceCompact?: boolean }) {
  const n = Number(amount) || 0;
  const compact = options?.forceCompact ?? Math.abs(n) >= 100_000;
  const value = compact ? formatCompactNumber(n) : n.toLocaleString();
  return `${value} ${CURRENCY_CODE}`;
}

/** Chart labels — always prefer compact when value is large. */
export function formatChartAmount(amount: number): string {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1_000) return formatCompactNumber(n);
  return n.toLocaleString();
}
