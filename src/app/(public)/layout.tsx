'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/AuthProvider';
import { ROUTES } from '@/lib/routes';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-0)' }}>
        <span style={{ color: 'var(--text-md)' }}>Checking your session...</span>
      </div>
    );
  }

  if (status === 'authenticated') {
    return <AppShell>{children}</AppShell>;
  }

  // Anonymous and unverified visitors can still view public-visibility content here — the page
  // components themselves already fall back to anonymous-safe API calls (no session required).
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid var(--border-1)',
      }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-hi)', textDecoration: 'none' }}>
          SimPle
        </Link>
        <Link href={ROUTES.login} style={{ color: 'var(--text-md)', textDecoration: 'none', fontSize: 14 }}>
          Sign in
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
