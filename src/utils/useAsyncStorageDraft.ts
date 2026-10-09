import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVE_MS = 400;

/** Unfinished form drafts expire after 1 minute of no save. */
export const DRAFT_TTL_MS = 60 * 1000;

const DRAFT_META = '_savedAt';

function stripMeta(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const { [DRAFT_META]: _ignored, ...draft } = parsed as Record<string, unknown>;
  return draft;
}

function isDraftFresh(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const savedAt = Number((parsed as Record<string, unknown>)[DRAFT_META]);
  if (!Number.isFinite(savedAt) || savedAt <= 0) return false;
  return Date.now() - savedAt <= DRAFT_TTL_MS;
}

/**
 * Debounced AsyncStorage draft for unfinished forms.
 * Never store passwords or photos in `value`.
 * Drafts expire after {@link DRAFT_TTL_MS} from last save.
 */
export function useAsyncStorageDraft<T>({
  key,
  enabled,
  value,
  isDirty,
  isValid,
  apply,
}: {
  key: string;
  enabled: boolean;
  value: T;
  isDirty: (value: T) => boolean;
  isValid?: (raw: unknown) => raw is T;
  apply: (next: T) => void;
}) {
  const ready = useRef(false);
  const [hydrated, setHydrated] = useState(() => !enabled || !key);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const isValidRef = useRef(isValid);
  isValidRef.current = isValid;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !key) {
      ready.current = true;
      setHydrated(true);
      return;
    }
    let alive = true;
    ready.current = false;
    setHydrated(false);
    void AsyncStorage.getItem(key)
      .then(async (raw) => {
        if (!alive) return;
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (!isDraftFresh(parsed)) {
            await AsyncStorage.removeItem(key);
            return;
          }
          const draft = stripMeta(parsed);
          const validate = isValidRef.current;
          const ok = validate ? validate(draft) : draft != null && typeof draft === 'object';
          if (ok && draft && isDirtyRef.current(draft as T)) applyRef.current(draft as T);
        } catch {
          /* ignore corrupt draft */
        }
      })
      .finally(() => {
        if (!alive) return;
        ready.current = true;
        setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !key || !ready.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!isDirtyRef.current(value)) {
        void AsyncStorage.removeItem(key);
        return;
      }
      void AsyncStorage.setItem(
        key,
        JSON.stringify({ ...(value as object), [DRAFT_META]: Date.now() })
      );
    }, SAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, enabled, key]);

  const clearDraft = useCallback(() => {
    ready.current = true;
    if (key) void AsyncStorage.removeItem(key);
  }, [key]);

  return { clearDraft, hydrated };
}

export function clearAsyncStorageDraft(key: string) {
  return AsyncStorage.removeItem(key);
}
