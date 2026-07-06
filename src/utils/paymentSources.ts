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

export function paymentSourceColor(source?: string | null) {
  switch (source) {
    case 'enroll':
      return '#a78bfa';
    case 'renew':
      return '#38bdf8';
    case 'change_plan':
      return '#fbbf24';
    default:
      return '#94a3b8';
  }
}
