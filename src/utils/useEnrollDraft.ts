import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { clearAsyncStorageDraft, useAsyncStorageDraft } from '@/src/utils/useAsyncStorageDraft';

const DRAFT_KEY = 'niku.enroll.draft';
const DRAFT_KEY_LEGACY_MIGRATED = 'vibe.draft.enroll';

export type EnrollDraft = {
  name: string;
  phone: string;
  planId: number | null;
  startDate: string;
  paymentDate: string;
  method: (typeof PAYMENT_METHODS)[number];
  skipPayment: boolean;
  trainerId: number | null;
  trainerFee: string;
  trainerFeeMethod: (typeof PAYMENT_METHODS)[number];
  branchId: number | null;
  enrollStep: number;
  enrollMaxStep: number;
};

export function emptyEnrollDraft(today: string): EnrollDraft {
  return {
    name: '',
    phone: '',
    planId: null,
    startDate: today,
    paymentDate: today,
    method: 'Cash',
    skipPayment: false,
    trainerId: null,
    trainerFee: '',
    trainerFeeMethod: 'Cash',
    branchId: null,
    enrollStep: 1,
    enrollMaxStep: 1,
  };
}

function isDraft(value: unknown): value is EnrollDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as EnrollDraft;
  return typeof d.name === 'string' && typeof d.phone === 'string';
}

export function enrollDraftIsDirty(draft: EnrollDraft, today: string) {
  const empty = emptyEnrollDraft(today);
  return (
    draft.name.trim() !== empty.name ||
    draft.phone.trim() !== empty.phone ||
    draft.planId != null ||
    draft.skipPayment ||
    draft.enrollStep > 1 ||
    draft.method !== empty.method
  );
}

export function clearEnrollDraft() {
  return Promise.all([
    clearAsyncStorageDraft(DRAFT_KEY),
    clearAsyncStorageDraft(DRAFT_KEY_LEGACY_MIGRATED),
  ]).then(() => undefined);
}

/** Persist enroll fields when the user leaves mid-flow (no photo — too large). */
export function useEnrollDraft({
  enabled,
  today,
  draft,
  apply,
}: {
  enabled: boolean;
  today: string;
  draft: EnrollDraft;
  apply: (next: EnrollDraft) => void;
}) {
  return useAsyncStorageDraft<EnrollDraft>({
    key: DRAFT_KEY,
    enabled,
    value: draft,
    isDirty: (v) => enrollDraftIsDirty(v, today),
    isValid: isDraft,
    apply,
  });
}

/** @internal migrate helper for tests / one-off */
export async function migrateEnrollDraftKeyIfNeeded() {
  const next = await AsyncStorage.getItem(DRAFT_KEY_LEGACY_MIGRATED);
  if (!next) return;
  const prev = await AsyncStorage.getItem(DRAFT_KEY);
  if (!prev) await AsyncStorage.setItem(DRAFT_KEY, next);
  await AsyncStorage.removeItem(DRAFT_KEY_LEGACY_MIGRATED);
}
