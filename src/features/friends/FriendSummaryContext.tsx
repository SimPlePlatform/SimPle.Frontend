'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendsApi } from './friendsApi';
import type { FriendSummaryDto } from './types';

interface FriendSummaryCtx {
  summary: FriendSummaryDto | null;
  loading: boolean;
  error: string | null;
  invalidate: () => void;
  retry: () => void;
}

const Ctx = createContext<FriendSummaryCtx | null>(null);

export function useFriendSummary(): FriendSummaryCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFriendSummary must be used within FriendSummaryProvider');
  return ctx;
}

export function FriendSummaryProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [summary, setSummary] = useState<FriendSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (status !== 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    friendsApi.getSummary()
      .then(s  => { if (!cancelled) { setSummary(s); setError(null); } })
      .catch(e => {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : 'Could not load friend counts.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [status, rev]);

  const invalidate = () => setRev(r => r + 1);
  const retry      = () => setRev(r => r + 1);

  return (
    <Ctx.Provider value={{ summary, loading, error, invalidate, retry }}>
      {children}
    </Ctx.Provider>
  );
}
