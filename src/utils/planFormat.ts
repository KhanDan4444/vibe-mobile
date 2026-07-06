import type { TFunction } from 'i18next';

/** Plan duration is stored in months (matches web + backend). */
export function formatPlanDuration(duration: number, t: TFunction): string {
  return t('common.month', { count: duration });
}

export function formatPlanLabel(plan: { name: string; duration: number; price: number | string }, t: TFunction): string {
  return `${plan.name} (${formatPlanDuration(plan.duration, t)} · ${Number(plan.price).toLocaleString()} ETB)`;
}
