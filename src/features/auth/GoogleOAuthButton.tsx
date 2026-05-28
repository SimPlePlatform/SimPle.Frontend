'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api-client';
import { useAuth } from './AuthProvider';

interface GoogleOAuthButtonProps {
  onError?: (message: string) => void;
}

export function GoogleOAuthButton({ onError }: GoogleOAuthButtonProps) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Keep a stable ref so the GIS callback always sees the latest loginWithGoogle.
  const loginRef = useRef(loginWithGoogle);
  useEffect(() => { loginRef.current = loginWithGoogle; }, [loginWithGoogle]);

  const handleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    setLoading(true);
    try {
      await loginRef.current(response.credential);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Google sign-in failed. Please try again.';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Initialize GIS whenever the script arrives (may already be loaded on re-render).
  useEffect(() => {
    if (!clientId) return;

    const init = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      // The <Script strategy="lazyOnload"> fires its own load event on the element.
      const script = document.getElementById('google-gis');
      script?.addEventListener('load', init, { once: true });
      return () => script?.removeEventListener('load', init);
    }
  }, [clientId, handleCredential]);

  const handleClick = () => {
    if (!window.google?.accounts?.id) {
      onError?.('Google sign-in is not available yet. Please try again in a moment.');
      return;
    }
    window.google.accounts.id.prompt(moment => {
      if (moment.isNotDisplayed() || moment.isSkippedMoment()) {
        // One Tap was suppressed (e.g. user dismissed it before); fall back to manual sign-in.
        onError?.('Please allow the Google sign-in popup or try again.');
      }
    });
  };

  if (!clientId) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      icon={loading ? 'refresh' : 'google'}
      disabled={loading}
      onClick={handleClick}
      aria-label="Sign in with Google"
    >
      {loading ? 'Signing in…' : 'Google'}
    </Button>
  );
}
