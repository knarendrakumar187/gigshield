import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../services/api';

type User = {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: 'worker' | 'admin';
  first_name: string;
  last_name: string;
};

type AuthState = {
  token: string;
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [token, setTok] = useState(getToken());
  const [user, setUser] = useState<User | null>(null);

  async function login(identifier: string, password: string) {
    const data = await api<{ access: string; refresh: string }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password },
    });
    setToken(data.access);
    setTok(data.access);
    await refreshProfile();
  }

  function logout() {
    clearToken();
    setTok('');
    setUser(null);
  }

  async function refreshProfile() {
    if (!getToken()) return;
    const profile = await api<User>('/auth/profile', { method: 'GET' });
    setUser(profile);
  }

  useEffect(() => {
    if (token && !user) {
      refreshProfile().catch(() => {
        // If token is stale, clear it to avoid loops.
        logout();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo<AuthState>(() => ({ token, user, login, logout, refreshProfile }), [token, user]);

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}

