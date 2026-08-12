import type { TFunction } from 'i18next';

/**
 * Humanize gym plan names for UI.
 * "Yearly(Gym)" / "Monthly (Gym)" / "Yearly - Gym" → "Yearly · Gym"; plain names stay unchanged.
 */
export function formatPlanDisplayName(name: string | null | undefined): string {
  if (name == null) return '';
  const raw = String(name).trim();
  if (!raw) return '';

  const paren = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    const head = paren[1].trim();
    const tag = paren[2].trim();
    if (head && tag) return `${head} · ${tag}`;
  }

  const dash = raw.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    const head = dash[1].trim();
    const tag = dash[2].trim();
    if (head && tag) return `${head} · ${tag}`;
  }

  return raw;
}

/** Plan duration is stored in months (matches web + backend). */
export function formatPlanDuration(duration: number, t: TFunction): string {
  return t('common.month', { count: duration });
}

export function formatPlanLabel(plan: { name: string; duration: number; price: number | string }, t: TFunction): string {
  return `${formatPlanDisplayName(plan.name)} (${formatPlanDuration(plan.duration, t)} · ${Number(plan.price).toLocaleString()} ETB)`;
}
