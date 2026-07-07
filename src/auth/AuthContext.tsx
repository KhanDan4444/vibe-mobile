import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchGymSubscription, loginRequest } from '@/src/api/auth';
import { apiRequest } from '@/src/api/client';
import { clearStoredGymName, clearStoredToken, getStoredGymName, getStoredToken, setStoredGymName, setStoredToken } from '@/src/auth/storage';
import { clearSessionCache } from '@/src/query/clearSessionCache';
import type { AuthUser, LoginResponse } from '@/src/types/api';
import { isTokenExpired, userFromToken } from '@/src/utils/jwt';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  gymName: string | null;
  subscription: LoginResponse['subscription'];
  loading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  updateGymName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<LoginResponse['subscription']>(null);
  const [gymName, setGymName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearSessionCache();
    await clearStoredToken();
    await clearStoredGymName();
    setToken(null);
    setUser(null);
    setSubscription(null);
    setGymName(null);
  }, []);

  const apiFetch = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      if (!token) {
        throw new Error('Not authenticated');
      }
      try {
        return await apiRequest<T>(path, { ...options, token });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          await logout();
        }
        throw err;
      }
    },
    [token, logout]
  );

  const login = useCallback(async (identifier: string, password: string, rememberMe = true) => {
    await clearSessionCache();
    const data = await loginRequest(identifier, password, rememberMe);
    await setStoredToken(data.token);
    const name = data.subscription?.gymName ?? null;
    if (name) {
      await setStoredGymName(name);
      setGymName(name);
    }
    setToken(data.token);
    setUser(data.user);
    setSubscription(data.subscription ?? null);
    return data.user;
  }, []);

  const updateGymName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await setStoredGymName(trimmed);
    setGymName(trimmed);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getStoredToken();
        if (!stored || cancelled || isTokenExpired(stored)) {
          if (stored) {
            await clearStoredToken();
            await clearStoredGymName();
          }
          return;
        }
        const restored = userFromToken(stored);
        if (!restored || cancelled) {
          await clearStoredToken();
          await clearStoredGymName();
          return;
        }
        setToken(stored);
        setUser(restored as AuthUser);
        const storedGymName = await getStoredGymName();
        if (storedGymName) setGymName(storedGymName);
        try {
          const currentSubscription = await fetchGymSubscription(stored);
          if (cancelled) return;
          setSubscription(currentSubscription);
          if (currentSubscription.gymName) {
            await setStoredGymName(currentSubscription.gymName);
            setGymName(currentSubscription.gymName);
          }
        } catch {
          // Non-blocking: protected requests still handle auth and subscription errors.
        }
      } catch {
        if (!cancelled) {
          await clearStoredToken();
          await clearStoredGymName();
          setToken(null);
          setUser(null);
          setGymName(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ user, token, gymName, subscription, loading, login, updateGymName, logout, apiFetch }),
    [user, token, gymName, subscription, loading, login, updateGymName, logout, apiFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
