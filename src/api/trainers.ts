import { apiRequest } from '@/src/api/client';
import type { TrainerRow, TrainersResponse } from '@/src/types/api';

export interface TrainerPayload {
  name: string;
  phone?: string | null;
  specialty?: string | null;
  branch_id: number;
  /** Data URL; `null` clears an existing certification on update. */
  certification?: string | null;
}

export function fetchTrainers(token: string, archived = false) {
  const qs = archived ? '?archived=1' : '';
  return apiRequest<TrainersResponse>(`/gym/trainers${qs}`, { token });
}

export function createTrainer(token: string, payload: TrainerPayload) {
  return apiRequest<{ trainer: TrainerRow }>('/gym/trainers', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateTrainer(token: string, id: number, payload: Partial<TrainerPayload>) {
  return apiRequest<{ trainer: TrainerRow }>(`/gym/trainers/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function archiveTrainer(token: string, id: number) {
  return apiRequest<{ ok: boolean }>(`/gym/trainers/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function restoreTrainer(token: string, id: number) {
  return apiRequest<{ trainer: TrainerRow }>(`/gym/trainers/${id}/restore`, {
    method: 'POST',
    token,
  });
}
