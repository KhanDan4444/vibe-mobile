import { apiRequest } from '@/src/api/client';
import type { PlanRow } from '@/src/types/api';

export interface PlanPayload {
  name: string;
  duration: number;
  price: number;
}

export function fetchPlans(token: string) {
  return apiRequest<PlanRow[]>('/plans', { token });
}

export function createPlan(token: string, payload: PlanPayload) {
  return apiRequest<PlanRow>('/plans', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updatePlan(token: string, id: number, payload: Partial<PlanPayload>) {
  return apiRequest<PlanRow>(`/plans/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function deletePlan(token: string, id: number) {
  return apiRequest<{ message: string }>(`/plans/${id}`, {
    method: 'DELETE',
    token,
  });
}
