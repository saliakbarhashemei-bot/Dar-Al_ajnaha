import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/auth';
import { setUnauthenticatedHandler } from '@/services/api';
import type { User } from '@/types/User';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (name: string) => boolean;
  hasRole: (name: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // A 401 anywhere in the app means the session is gone (expired token,
  // disabled account). Drop local state and send the user back to login.
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setUser((current) => {
        if (current) navigate('/login', { replace: true });
        return null;
      });
    });

    return () => setUnauthenticatedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback((name: string) => {
    return user?.permissions?.includes(name) ?? false;
  }, [user]);

  const hasRole = useCallback((name: string) => {
    return user?.roles?.some((r) => r.name === name) ?? false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
