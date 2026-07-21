import React, { createContext, useContext } from 'react';

/** True inside auth routes — forces dark palette without changing saved theme preference. */
const AuthThemeContext = createContext(false);

export function AuthThemeProvider({ children }: { children: React.ReactNode }) {
  return <AuthThemeContext.Provider value>{children}</AuthThemeContext.Provider>;
}

export function useAuthThemeForced() {
  return useContext(AuthThemeContext);
}
