import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import FlashToaster, { MAX_VISIBLE_TOASTS, type FlashToast } from '@/src/components/FlashBanner';
import { flashHaptic } from '@/src/utils/flashHaptic';

interface FlashContextValue {
  showFlash: (toast: FlashToast | string) => void;
  dismissToast: (id: string) => void;
  clearFlash: () => void;
}

const FlashContext = createContext<FlashContextValue | null>(null);

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function FlashProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(FlashToast & { id: string })[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearFlash = useCallback(() => setToasts([]), []);

  const showFlash = useCallback((next: FlashToast | string) => {
    const payload: FlashToast =
      typeof next === 'string' ? { title: next, variant: 'success' } : { variant: 'success', ...next };

    flashHaptic(payload.variant ?? 'success');

    setToasts((prev) => {
      const item = { id: createToastId(), ...payload };
      const stack = [...prev, item];
      if (stack.length <= MAX_VISIBLE_TOASTS) return stack;
      return stack.slice(stack.length - MAX_VISIBLE_TOASTS);
    });
  }, []);

  const value = useMemo(
    () => ({ showFlash, dismissToast, clearFlash }),
    [showFlash, dismissToast, clearFlash]
  );

  return (
    <FlashContext.Provider value={value}>
      {children}
      <Modal
        visible={toasts.length > 0}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View pointerEvents="box-none" style={styles.toastPortal}>
          <FlashToaster toasts={toasts} onDismiss={dismissToast} />
        </View>
      </Modal>
    </FlashContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },
});

export function useFlash() {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error('useFlash must be used within FlashProvider');
  return ctx;
}
