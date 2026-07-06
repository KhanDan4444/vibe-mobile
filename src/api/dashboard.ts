import { apiRequest } from '@/src/api/client';
import type { BranchComparisonRow, DashboardStats } from '@/src/types/api';

export function fetchDashboard(token: string, branchId?: number | 'all') {
  const qs = branchId && branchId !== 'all' ? `?branch_id=${branchId}` : '';
  return apiRequest<DashboardStats>(`/dashboard${qs}`, { token });
}

export function fetchBranchComparison(token: string) {
  return apiRequest<{ branches: BranchComparisonRow[] }>('/dashboard/branch-comparison', { token });
}
