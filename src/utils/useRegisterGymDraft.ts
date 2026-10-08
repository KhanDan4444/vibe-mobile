import { useAsyncStorageDraft, clearAsyncStorageDraft } from '@/src/utils/useAsyncStorageDraft';

export const REGISTER_GYM_DRAFT_KEY = 'vibe.draft.register-gym';

export type RegisterGymDraft = {
  step: 'phone' | 'gym' | 'account';
  phone: string;
  verifiedPhone: string;
  sessionId: string;
  otpVerified: boolean;
  gymName: string;
  city: string;
  address: string;
  ownerName: string;
  username: string;
  email: string;
};

export function emptyRegisterGymDraft(): RegisterGymDraft {
  return {
    step: 'phone',
    phone: '',
    verifiedPhone: '',
    sessionId: '',
    otpVerified: false,
    gymName: '',
    city: '',
    address: '',
    ownerName: '',
    username: '',
    email: '',
  };
}

function isDraft(value: unknown): value is RegisterGymDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as RegisterGymDraft;
  return (
    (d.step === 'phone' || d.step === 'gym' || d.step === 'account') &&
    typeof d.phone === 'string' &&
    typeof d.gymName === 'string'
  );
}

export function registerGymDraftIsDirty(draft: RegisterGymDraft) {
  const e = emptyRegisterGymDraft();
  return (
    draft.phone.trim() !== e.phone ||
    draft.verifiedPhone.trim() !== e.verifiedPhone ||
    draft.gymName.trim() !== e.gymName ||
    draft.city.trim() !== e.city ||
    draft.address.trim() !== e.address ||
    draft.ownerName.trim() !== e.ownerName ||
    draft.username.trim() !== e.username ||
    draft.email.trim() !== e.email ||
    draft.otpVerified ||
    draft.step !== 'phone'
  );
}

export function clearRegisterGymDraft() {
  return clearAsyncStorageDraft(REGISTER_GYM_DRAFT_KEY);
}

/** Non-secret signup fields only — never passwords or OTP code. */
export function useRegisterGymDraft({
  enabled,
  draft,
  apply,
}: {
  enabled: boolean;
  draft: RegisterGymDraft;
  apply: (next: RegisterGymDraft) => void;
}) {
  return useAsyncStorageDraft<RegisterGymDraft>({
    key: REGISTER_GYM_DRAFT_KEY,
    enabled,
    value: draft,
    isDirty: registerGymDraftIsDirty,
    isValid: isDraft,
    apply,
  });
}
