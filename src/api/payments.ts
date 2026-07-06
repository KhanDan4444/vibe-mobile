import { apiRequest } from '@/src/api/client';
import type { PaymentRow, PaymentsListResponse } from '@/src/types/api';

export interface CreatePaymentPayload {
  member_id: number;
  amount: number;
  date?: string;
  method?: string;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  search?: string;
  preset?: string;
  from?: string;
  to?: string;
  method?: string;
  sort?: string;
  branch_id?: number | string;
}

export function createPayment(token: string, payload: CreatePaymentPayload) {
  return apiRequest<PaymentRow>('/payments', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function fetchPayments(token: string, params: PaymentListParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.preset) qs.set('preset', params.preset);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.method) qs.set('method', params.method);
  if (params.sort) qs.set('sort', params.sort);
  if (params.branch_id) qs.set('branch_id', String(params.branch_id));
  const query = qs.toString();
  return apiRequest<PaymentsListResponse>(`/payments${query ? `?${query}` : ''}`, { token });
}

export interface UpdatePaymentPayload {
  amount: number;
  date: string;
  method: string;
}

export function updatePayment(token: string, id: number, payload: UpdatePaymentPayload) {
  return apiRequest<PaymentRow>(`/payments/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function deletePayment(token: string, id: number) {
  return apiRequest<{ message: string }>(`/payments/${id}`, {
    method: 'DELETE',
    token,
  });
}
