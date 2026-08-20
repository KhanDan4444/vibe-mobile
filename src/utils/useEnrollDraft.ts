import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYMENT_METHODS } from '@/src/constants/payments';

const DRAFT_KEY = 'niku.enroll.draft';
const SAVE_MS = 400;

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
  return AsyncStorage.removeItem(DRAFT_KEY);
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
  const ready = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!alive) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (isDraft(parsed) && enrollDraftIsDirty(parsed, today)) applyRef.current(parsed);
        } catch {
          /* ignore corrupt draft */
        }
      }
      ready.current = true;
    });
    return () => {
      alive = false;
    };
  }, [enabled, today]);

  useEffect(() => {
    if (!enabled || !ready.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!enrollDraftIsDirty(draft, today)) {
        void AsyncStorage.removeItem(DRAFT_KEY);
        return;
      }
      void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, SAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, enabled, today]);

  const clearDraft = useCallback(() => {
    ready.current = true;
    void clearEnrollDraft();
  }, []);

  return { clearDraft };
}
