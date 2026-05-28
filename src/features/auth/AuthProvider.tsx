'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, authApi, type LoginRequest, type RegisterRequest } from '@/lib/api-client';
import type { AuthUser } from '@/types';

// 'unverified' = signed in but email not yet confirmed
export type AuthStatus = 'loading' | 'authenticated' | 'unverified' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (request: LoginRequest) => Promise<AuthUser>;
  register: (request: RegisterRequest) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  reloadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function statusFromUser(user: AuthUser): AuthStatus {
  return user.isEmailVerified ? 'authenticated' : 'unverified';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const reloadSession = useCallback(async () => {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      setStatus(statusFromUser(currentUser));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          const refreshedUser = await authApi.refresh();
          setUser(refreshedUser);
          setStatus(statusFromUser(refreshedUser));
          return;
        } catch {
          // A missing or expired refresh cookie means this browser is signed out.
        }
      }

      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    // The provider initializes itself from the server-managed auth cookies.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadSession();
  }, [reloadSession]);

  const login = useCallback(async (request: LoginRequest) => {
    const signedInUser = await authApi.login(request);
    setUser(signedInUser);
    setStatus(statusFromUser(signedInUser));
    return signedInUser;
  }, []);

  const register = useCallback(async (request: RegisterRequest) => {
    const newUser = await authApi.register(request);
    setUser(newUser);
    setStatus(statusFromUser(newUser));
    return newUser;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const signedInUser = await authApi.googleLogin(idToken);
    setUser(signedInUser);
    setStatus(statusFromUser(signedInUser));
    return signedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const logoutAll = useCallback(async () => {
    await authApi.logoutAll();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({
    user,
    status,
    login,
    register,
    loginWithGoogle,
    logout,
    logoutAll,
    reloadSession,
  }), [user, status, login, register, loginWithGoogle, logout, logoutAll, reloadSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
