import { apiRequest } from '@/src/api/client';
import type { GymSignupCompletePayload, GymSubscription, LoginResponse, PublicSaasPlan } from '@/src/types/api';
import { normalizeEthiopianPhone } from '@/src/utils/phone';

export function loginRequest(email: string, password: string, rememberMe = true) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password, rememberMe }),
  });
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function fetchGymSubscription(token: string) {
  return apiRequest<GymSubscription>('/gym/subscription', { token });
}

export function requestForgotPasswordOtp(identifier: string) {
  const trimmed = identifier.trim();
  const phone = normalizeEthiopianPhone(trimmed);
  return apiRequest<{ message?: string; sessionId?: string }>('/auth/forgot-password/request-otp', {
    method: 'POST',
    body: JSON.stringify({ username: phone || trimmed.toLowerCase() }),
  });
}

export function resetPasswordWithOtp(payload: { sessionId: string; code: string; password: string }) {
  return apiRequest<{ message?: string }>('/auth/forgot-password/reset-otp', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: payload.sessionId,
      code: payload.code.trim(),
      password: payload.password,
    }),
  });
}

export function getPublicSaasPlans() {
  return apiRequest<{ plans: PublicSaasPlan[] }>('/auth/saas-plans').then((data) => data.plans ?? []);
}

export function requestGymSignupOtp(phone: string) {
  return apiRequest<{ message?: string; sessionId: string; expiresAt?: string }>(
    '/auth/gym-signup/request-otp',
    {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim() }),
    }
  );
}

export function completeGymSignup(payload: GymSignupCompletePayload) {
  return apiRequest<{ message?: string }>('/auth/gym-signup/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
