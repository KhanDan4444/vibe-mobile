import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FlashBanner, type FlashToast } from '@/src/components/FlashBanner';

interface FlashContextValue {
  showFlash: (toast: FlashToast | string) => void;
}

const FlashContext = createContext<FlashContextValue | null>(null);

export function FlashProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<FlashToast | null>(null);

  const showFlash = useCallback((next: FlashToast | string) => {
    if (typeof next === 'string') {
      setToast({ title: next, variant: 'success' });
      return;
    }
    setToast(next);
  }, []);

  const dismiss = useCallback(() => setToast(null), []);
  const value = useMemo(() => ({ showFlash }), [showFlash]);

  return (
    <FlashContext.Provider value={value}>
      {children}
      <FlashBanner toast={toast} onDismiss={dismiss} />
    </FlashContext.Provider>
  );
}

export function useFlash() {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error('useFlash must be used within FlashProvider');
  return ctx;
}
