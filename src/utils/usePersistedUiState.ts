import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVE_MS = 300;

/**
 * Persist lightweight UI state (filters, search, sort) across app kills.
 * Not for secrets. Debounced writes.
 */
export function usePersistedUiState<T>(
  key: string,
  initial: T,
  opts?: {
    /** When false, skip hydrate/save (e.g. deep-link owns the value). */
    enabled?: boolean;
    isValid?: (raw: unknown) => raw is T;
  }
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const enabled = opts?.enabled !== false;
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(!enabled);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    let alive = true;
    setReady(false);
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive || raw == null) return;
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (opts?.isValid) {
            if (opts.isValid(parsed)) setState(parsed);
          } else if (parsed !== undefined) {
            setState(parsed as T);
          }
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per key/enabled
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled || !ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void AsyncStorage.setItem(key, JSON.stringify(state));
    }, SAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, enabled, ready, key]);

  return [state, setState, ready];
}

/** Persist a plain string (e.g. last login identifier). */
export async function readStoredString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeStoredString(key: string, value: string): Promise<void> {
  try {
    if (!value) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
