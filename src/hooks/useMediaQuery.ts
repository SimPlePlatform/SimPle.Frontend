'use client';
import { useSyncExternalStore } from 'react';

// SSR-safe matchMedia hook. Server always returns false (mobile-first).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = typeof window !== 'undefined' ? matchMedia(query) : null;
      m?.addEventListener('change', cb);
      return () => m?.removeEventListener('change', cb);
    },
    () => typeof window !== 'undefined' ? matchMedia(query).matches : false,
    () => false,
  );
}

export const useIsDesktop  = () => useMediaQuery('(min-width: 1024px)');
export const useIsSidebar  = () => useMediaQuery('(min-width: 1280px)');
export const useIsTablet   = () => useMediaQuery('(min-width: 768px)');
export const useIsTouch    = () => useMediaQuery('(pointer: coarse)');
export const useLandscape  = () => useMediaQuery('(orientation: landscape)');
