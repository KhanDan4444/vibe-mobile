import { apiRequest } from '@/src/api/client';
import type { MemberRow, PaymentListRow } from '@/src/types/api';

export interface ReportParams {
  branch_id?: number | string;
  filter?: string;
  status?: string;
  preset?: string;
  from?: string;
  to?: string;
  search?: string;
  method?: string;
  sort?: string;
}

export interface MemberReportResponse {
  generatedAt: string;
  count: number;
  branchId: number | null;
  members: MemberRow[];
}

export interface RevenueReportResponse {
  generatedAt: string;
  count: number;
  branchId: number | null;
  summary: { total: number; count: number; average: number };
  payments: PaymentListRow[];
}

export function fetchMemberReport(token: string, params: ReportParams = {}) {
  const qs = new URLSearchParams();
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  if (params.filter) qs.set('filter', params.filter);
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiRequest<MemberReportResponse>(`/reports/members${query ? `?${query}` : ''}`, { token });
}

export function fetchRevenueReport(token: string, params: ReportParams = {}) {
  const qs = new URLSearchParams();
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  if (params.preset) qs.set('preset', params.preset);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.search) qs.set('search', params.search);
  if (params.method) qs.set('method', params.method);
  if (params.sort) qs.set('sort', params.sort);
  const query = qs.toString();
  return apiRequest<RevenueReportResponse>(`/reports/revenue${query ? `?${query}` : ''}`, { token });
}
