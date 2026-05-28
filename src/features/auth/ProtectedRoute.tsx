'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`${ROUTES.login}?next=${encodeURIComponent(pathname)}`);
    } else if (status === 'unverified') {
      router.replace(ROUTES.verifyEmail);
    }
  }, [pathname, router, status]);

  if (status !== 'authenticated') {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg-0)' }}>
        <span style={{ color:'var(--text-md)' }}>Checking your session...</span>
      </div>
    );
  }

  return children;
}
