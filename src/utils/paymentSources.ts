const SOURCE_LABELS: Record<string, string> = {
  enroll: 'Enrollment',
  renew: 'Renewal',
  change_plan: 'Plan change',
  collect: 'Collected',
};

export function paymentSourceLabel(source?: string | null) {
  if (!source) return 'Recorded';
  return SOURCE_LABELS[source] ?? 'Recorded';
}

/** Quiet muted tone for all sources — text carries meaning, not color. */
export function paymentSourceColor(_source?: string | null) {
  return '#94a3b8';
}
