import { apiRequest } from '@/src/api/client';
import type { MemberSmsRow, PaginatedResponse } from '@/src/types/api';

export interface MemberSmsParams {
  page?: number;
  limit?: number;
  type?: 'all' | 'member_due_soon' | 'member_expires_today' | 'member_expired';
  branch_id?: number | string;
}

export function fetchMemberSms(token: string, params: MemberSmsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.type && params.type !== 'all') qs.set('type', params.type);
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  const query = qs.toString();
  return apiRequest<PaginatedResponse<MemberSmsRow>>(`/gym/member-sms${query ? `?${query}` : ''}`, {
    token,
  });
}
