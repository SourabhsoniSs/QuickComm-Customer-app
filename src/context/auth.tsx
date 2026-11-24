import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { customerApi, setApiToken, setUnauthorizedHandler } from '@/lib/api';
import { getJSON, KEYS, removeKey, setJSON, tokenStore } from '@/lib/storage';

type User = Record<string, any> | null;

type AuthValue = {
  user: User;
  token: string | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (token: string, user: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Latest profile from the server (also cached on the device); null on failure. */
async function fetchProfile() {
  try {
    const res = await customerApi.getProfile();
    const profile = res.data?.result ?? res.data?.data ?? null;
    if (profile) setJSON(KEYS.user, profile);
    return profile as Record<string, any> | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    await Promise.all([tokenStore.clear(), removeKey(KEYS.user)]);
  }, []);

  // Restore the session on launch
  useEffect(() => {
    (async () => {
      const [saved, savedUser] = await Promise.all([tokenStore.get(), getJSON<User>(KEYS.user, null)]);
      if (saved) {
        setApiToken(saved);
        setToken(saved);
        setUser(savedUser);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (newToken: string, newUser: Record<string, any>) => {
    setApiToken(newToken);
    setToken(newToken);
    setUser(newUser);
    await Promise.all([tokenStore.set(newToken), setJSON(KEYS.user, newUser)]);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const profile = await fetchProfile();
    if (profile) setUser(profile);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchProfile().then((profile) => {
      if (active && profile) setUser(profile);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token), ready, login, logout, refreshUser }),
    [user, token, ready, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
