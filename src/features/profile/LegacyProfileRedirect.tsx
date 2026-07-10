'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { ROUTES } from '@/lib/routes';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

// Legacy `/profile/{userId}` links only resolve when the id matches the signed-in viewer — there is no
// backend UUID→username lookup endpoint, so any other id can't be honestly resolved to a profile.
export function LegacyProfileRedirect({ userId }: { userId: string }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (userId === 'me') {
      router.replace(user ? ROUTES.u(user.username) : ROUTES.login);
      return;
    }
    if (user && userId === user.id) {
      router.replace(ROUTES.u(user.username));
    }
  }, [status, user, userId, router]);

  if (status === 'loading') {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (userId === 'me' || (user && userId === user.id)) {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          Redirecting…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <EmptyState
        icon="link"
        title="This link has moved"
        body="Profile links now use usernames. Search Friends to find this person's new profile link."
        action={<Button size="sm" onClick={() => router.push(ROUTES.friends)}>Go to Friends</Button>}
      />
    </div>
  );
}
