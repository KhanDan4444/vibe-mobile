import { apiRequest } from '@/src/api/client';
import type { GymProfileResponse, UpdateProfilePayload } from '@/src/types/api';

export function fetchGymProfile(token: string) {
  return apiRequest<GymProfileResponse>('/gym/profile', { token });
}

export function updateGymProfile(token: string, payload: UpdateProfilePayload) {
  return apiRequest<GymProfileResponse>('/gym/profile', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
