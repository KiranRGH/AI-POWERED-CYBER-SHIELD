import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, LoginCredentials } from '../api/auth';
import { usersApi } from '../api/users';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  profile_photo: string | null;
  permissions?: string[];
  created_at: string;
  last_login: string | null;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Persistent token accessor (localStorage fallback for reliable routing & page refreshes)
let inMemoryAccessToken: string | null = null;

export const getAccessToken = () => {
  return inMemoryAccessToken || localStorage.getItem('access_token');
};

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Eagerly restore user from cache to prevent blank-screen or redirect flickers
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTokenRefresh = useCallback((expiresInMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const refreshInMs = Math.max(expiresInMs - 60_000, 10_000);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await authApi.refreshToken();
        setAccessToken(response.access_token);
        scheduleTokenRefresh(response.expires_in * 1000);
      } catch {
        // Silently let token expire or retry on next action
      }
    }, refreshInMs);
  }, []);

  // On mount: restore session using stored token or refresh token
  useEffect(() => {
    const restoreSession = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await usersApi.getMe();
        setUser(me);
        localStorage.setItem('auth_user', JSON.stringify(me));
      } catch {
        // Token expired or invalid
        setAccessToken(null);
        localStorage.removeItem('auth_user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    const response = await authApi.login(credentials);
    setAccessToken(response.access_token);
    scheduleTokenRefresh(response.expires_in * 1000);

    const me = await usersApi.getMe();
    setUser(me);
    localStorage.setItem('auth_user', JSON.stringify(me));
    return me;
  }, [scheduleTokenRefresh]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    localStorage.removeItem('auth_user');
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await usersApi.getMe();
      setUser(me);
      localStorage.setItem('auth_user', JSON.stringify(me));
    } catch {
      /* ignore */
    }
  }, []);

  // Case-insensitive role comparison
  const hasRole = useCallback((role: string | string[]) => {
    if (!user || !user.role) return false;
    const userRole = user.role.toLowerCase();
    if (Array.isArray(role)) {
      return role.map((r) => r.toLowerCase()).includes(userRole);
    }
    return userRole === role.toLowerCase();
  }, [user]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role?.toLowerCase() === 'superadmin') return true;
    return user.permissions?.includes(permission) ?? false;
  }, [user]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
