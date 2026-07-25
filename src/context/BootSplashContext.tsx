import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type BootSplashContextValue = {
  /** True until the first real screen (login / tabs) is ready to show. */
  bootVisible: boolean;
  dismissBootSplash: () => void;
};

const BootSplashContext = createContext<BootSplashContextValue | null>(null);

export function BootSplashProvider({ children }: { children: React.ReactNode }) {
  const [bootVisible, setBootVisible] = useState(true);
  const dismissBootSplash = useCallback(() => setBootVisible(false), []);
  const value = useMemo(
    () => ({ bootVisible, dismissBootSplash }),
    [bootVisible, dismissBootSplash],
  );
  return <BootSplashContext.Provider value={value}>{children}</BootSplashContext.Provider>;
}

export function useBootSplash() {
  const ctx = useContext(BootSplashContext);
  if (!ctx) {
    return { bootVisible: false, dismissBootSplash: () => {} };
  }
  return ctx;
}
