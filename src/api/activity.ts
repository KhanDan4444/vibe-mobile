import { apiRequest } from '@/src/api/client';
import type { ActivityLogRow, PaginatedResponse } from '@/src/types/api';

export interface ActivityListParams {
  page?: number;
  limit?: number;
  actor?: 'all' | 'owner' | 'staff';
  branch_id?: number | string;
}

export function fetchActivityLogs(token: string, params: ActivityListParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.actor && params.actor !== 'all') qs.set('actor', params.actor);
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ActivityLogRow>>(`/gym/activity${query ? `?${query}` : ''}`, {
    token,
  });
}
