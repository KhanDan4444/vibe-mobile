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

export type BranchStationPassResponse = {
  station_version: number;
  station_token: string;
  check_in_url: string;
  qr_data_url: string;
  gym_name: string;
  branch_name: string;
  station_self_checkin: boolean;
};

export function fetchBranchStationPass(token: string, branchId: number) {
  return apiRequest<BranchStationPassResponse>(`/gym/branches/${branchId}/station-pass`, { token });
}

export function regenerateBranchStationPass(token: string, branchId: number) {
  return apiRequest<BranchStationPassResponse>(`/gym/branches/${branchId}/station-pass/regenerate`, {
    method: 'POST',
    token,
  });
}
