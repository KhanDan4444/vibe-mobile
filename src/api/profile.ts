import { apiRequest } from '@/src/api/client';
import type {
  GymProfileResponse,
  GymTelegramLinkResponse,
  UpdateProfilePayload,
} from '@/src/types/api';

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

export function createGymTelegramLink(token: string) {
  return apiRequest<GymTelegramLinkResponse>('/gym/profile/telegram/link-token', {
    method: 'POST',
    token,
  });
}

export function unlinkGymTelegram(token: string) {
  return apiRequest<{ ok: boolean; gym_id: number }>('/gym/profile/telegram', {
    method: 'DELETE',
    token,
  });
}
