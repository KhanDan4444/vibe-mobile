import { fetchRevenueReport, type ReportParams } from '@/src/api/reports';
import type { PaymentListRow } from '@/src/types/api';

export type RevenueExportParams = Pick<
  ReportParams,
  'preset' | 'from' | 'to' | 'branch_id' | 'search' | 'method' | 'sort'
>;

/** Full payment list for export (report endpoint — all rows matching filters). */
export async function fetchAllPaymentsForExport(
  token: string,
  params: RevenueExportParams
): Promise<PaymentListRow[]> {
  const useCustom = Boolean(params.from && params.to);
  const report = await fetchRevenueReport(token, {
    branch_id: params.branch_id,
    preset: useCustom ? undefined : params.preset,
    from: params.from,
    to: params.to,
    search: params.search,
    method: params.method,
    sort: params.sort,
  });
  return report.payments ?? [];
}
