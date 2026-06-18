import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Role } from '@wh/shared';
import { login as apiLogin, tokenStore, type LoginAdmin } from './api';

interface AuthContextValue {
  admin: LoginAdmin | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);
const ADMIN_KEY = 'wh_admin_user';

function loadAdmin(): LoginAdmin | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginAdmin;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<LoginAdmin | null>(loadAdmin);

  const login = async (identifier: string, password: string) => {
    const res = await apiLogin(identifier, password);
    if (res.admin.role !== Role.SUPER_ADMIN) {
      throw new Error('This console is for platform administrators only.');
    }
    tokenStore.set(res.accessToken);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin));
    setAdmin(res.admin);
  };

  const logout = () => {
    tokenStore.clear();
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
  };

  // A 401 from any request (stale/expired token) bounces back to login.
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem(ADMIN_KEY);
      setAdmin(null);
    };
    window.addEventListener('wh-unauthorized', onUnauthorized);
    return () => window.removeEventListener('wh-unauthorized', onUnauthorized);
  }, []);

  return <AuthContext.Provider value={{ admin, login, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
