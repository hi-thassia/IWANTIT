import type { AuthResponse, AuthUser, LoginResponse } from '@iwantit/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { api } from '@/lib/api';

type Credentials = { email: string; password: string };
type AuthContextValue = {
  user: AuthUser | null; loading: boolean;
  login: (input: Credentials) => Promise<{ challengeToken?: string }>;
  completeTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  completeGoogleTwoFactor: (code: string) => Promise<void>;
  register: (input: Credentials & { name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<AuthResponse>('/api/auth/session').then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const refresh = useCallback(async () => setUser((await api<AuthResponse>('/api/auth/session')).user), []);
  const login = useCallback(async (input: Credentials) => { const result = await api<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }); if ('requiresTwoFactor' in result) return { challengeToken: result.challengeToken }; setUser(result.user); return {}; }, []);
  const completeTwoFactor = useCallback(async (challengeToken: string, code: string) => setUser((await api<AuthResponse>('/api/auth/login/2fa', { method: 'POST', body: JSON.stringify({ challengeToken, code }) })).user), []);
  const completeGoogleTwoFactor = useCallback(async (code: string) => setUser((await api<AuthResponse>('/api/auth/google/2fa', { method: 'POST', body: JSON.stringify({ code }) })).user), []);
  const register = useCallback(async (input: Credentials & { name: string }) => setUser((await api<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })).user), []);
  const logout = useCallback(async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null); }, []);
  const value = useMemo(() => ({ user, loading, login, completeTwoFactor, completeGoogleTwoFactor, register, logout, refresh }), [user, loading, login, completeTwoFactor, completeGoogleTwoFactor, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
