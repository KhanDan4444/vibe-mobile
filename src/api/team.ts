import { apiRequest } from '@/src/api/client';
import type { StaffRow, TeamResponse } from '@/src/types/api';

export interface CreateStaffPayload {
  name: string;
  email?: string | null;
  username: string;
  password: string;
  staff_role?: string;
  branch_id: number;
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string | null;
  username?: string;
  password?: string;
  staff_role?: string;
  branch_id?: number;
  is_active?: boolean;
}

export function fetchTeam(token: string) {
  return apiRequest<TeamResponse>('/gym/team', { token });
}

export function createStaff(token: string, payload: CreateStaffPayload) {
  return apiRequest<{ staff: StaffRow }>('/gym/team', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateStaff(token: string, id: number, payload: UpdateStaffPayload) {
  return apiRequest<{ staff: StaffRow }>(`/gym/team/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function resetStaffPassword(token: string, id: number, password: string) {
  return apiRequest<{ staff: StaffRow }>(`/gym/team/${id}/reset-password`, {
    method: 'POST',
    token,
    body: JSON.stringify({ password }),
  });
}
