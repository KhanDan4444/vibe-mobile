import { apiRequest } from '@/src/api/client';
import type { BranchRow } from '@/src/types/api';

export interface BranchPayload {
  name: string;
  phone?: string | null;
  address?: string | null;
}

export interface UpdateBranchPayload extends Partial<BranchPayload> {
  is_active?: boolean;
  is_default?: boolean;
}

export function fetchBranches(token: string) {
  return apiRequest<{ branches: BranchRow[] }>('/gym/branches', { token });
}

export function createBranch(token: string, payload: BranchPayload) {
  return apiRequest<{ branch: BranchRow }>('/gym/branches', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateBranch(token: string, id: number, payload: UpdateBranchPayload) {
  return apiRequest<{ branch: BranchRow }>(`/gym/branches/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
