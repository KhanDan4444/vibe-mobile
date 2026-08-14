import { apiRequest } from '@/src/api/client';
import type { ChangePlanPayload, EnrollPayload, MemberRow, PaginatedResponse, PaymentRow, RenewPayload, UpdateMemberPayload } from '@/src/types/api';

export interface MemberListParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'due_soon' | 'expired' | 'unpaid';
  status?: string;
  sort?: string;
  branch_id?: number | string;
}

export function fetchMembers(token: string, params: MemberListParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.filter) qs.set('filter', params.filter);
  if (params.status) qs.set('status', params.status);
  if (params.sort) qs.set('sort', params.sort);
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  const query = qs.toString();
  return apiRequest<PaginatedResponse<MemberRow>>(`/members${query ? `?${query}` : ''}`, {
    token,
  });
}

export function fetchArchivedMembers(token: string, params: MemberListParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  const query = qs.toString();
  return apiRequest<PaginatedResponse<MemberRow>>(`/members/archived${query ? `?${query}` : ''}`, {
    token,
  });
}

export function fetchMember(token: string, id: number) {
  return apiRequest<MemberRow>(`/members/${id}`, { token });
}

export function fetchMemberPayments(token: string, id: number) {
  return apiRequest<PaymentRow[]>(`/members/${id}/payments`, { token });
}

export function enrollMember(token: string, payload: EnrollPayload) {
  return apiRequest<{ member: MemberRow }>('/members/enroll', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function renewMember(token: string, id: number, payload: RenewPayload) {
  return apiRequest<{ member: MemberRow }>(`/members/${id}/renew`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function changeMemberPlan(token: string, id: number, payload: ChangePlanPayload) {
  return apiRequest<{ member: MemberRow }>(`/members/${id}/change-plan`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function transferMember(token: string, id: number, branchId: number) {
  return apiRequest<MemberRow>(`/members/${id}/transfer`, {
    method: 'POST',
    token,
    body: JSON.stringify({ branch_id: branchId }),
  });
}

export function updateMember(token: string, id: number, payload: UpdateMemberPayload) {
  return apiRequest<MemberRow>(`/members/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteMember(token: string, id: number) {
  return apiRequest<{ message: string }>(`/members/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function restoreMember(token: string, id: number) {
  return apiRequest<MemberRow>(`/members/${id}/restore`, {
    method: 'POST',
    token,
  });
}
