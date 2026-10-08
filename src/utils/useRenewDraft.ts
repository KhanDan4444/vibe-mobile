import { PAYMENT_METHODS } from '@/src/constants/payments';
import { clearAsyncStorageDraft, useAsyncStorageDraft } from '@/src/utils/useAsyncStorageDraft';

export type RenewDraft = {
  planId: number | null;
  startDate: string;
  amount: string;
  paymentDate: string;
  method: (typeof PAYMENT_METHODS)[number];
};

function renewDraftKey(memberId: number) {
  return `vibe.draft.renew:${memberId}`;
}

function isDraft(value: unknown): value is RenewDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as RenewDraft;
  return typeof d.amount === 'string' && typeof d.startDate === 'string';
}

export function renewDraftIsDirty(draft: RenewDraft, defaults: { startDate: string; paymentDate: string }) {
  return (
    draft.planId != null ||
    draft.amount.trim() !== '' ||
    draft.startDate !== defaults.startDate ||
    draft.paymentDate !== defaults.paymentDate ||
    draft.method !== 'Cash'
  );
}

export function clearRenewDraft(memberId: number) {
  return clearAsyncStorageDraft(renewDraftKey(memberId));
}

export function useRenewDraft({
  memberId,
  enabled,
  draft,
  defaults,
  apply,
}: {
  memberId: number | null;
  enabled: boolean;
  draft: RenewDraft;
  defaults: { startDate: string; paymentDate: string };
  apply: (next: RenewDraft) => void;
}) {
  const key = memberId != null && memberId > 0 ? renewDraftKey(memberId) : '';
  return useAsyncStorageDraft<RenewDraft>({
    key,
    enabled: enabled && Boolean(key),
    value: draft,
    isDirty: (v) => renewDraftIsDirty(v, defaults),
    isValid: isDraft,
    apply,
  });
}
