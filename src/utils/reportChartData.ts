import type { PaymentListRow } from '@/src/types/api';
import type { DashboardChartPoint } from '@/src/types/api';

export function aggregateRevenueByDate(payments: PaymentListRow[]): DashboardChartPoint[] {
  const totals: Record<string, number> = {};
  for (const payment of payments) {
    const date = payment.date ? String(payment.date).split('T')[0] : '';
    if (!date) continue;
    totals[date] = (totals[date] || 0) + (Number(payment.amount) || 0);
  }
  return Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}
