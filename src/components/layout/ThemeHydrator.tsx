'use client';

import React from 'react';

export function ThemeHydrator() {
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');

    const applyStoredMode = () => {
      const stored = window.localStorage.getItem('simple-color-mode');
      const mode = stored === 'Light' || stored === 'System' ? stored : 'Dark';
      const resolved = mode === 'System' && media.matches ? 'light' : mode.toLowerCase();
      document.documentElement.dataset.colorMode = resolved;
    };

    applyStoredMode();
    media.addEventListener('change', applyStoredMode);
    window.addEventListener('storage', applyStoredMode);
    window.addEventListener('simple-theme-change', applyStoredMode);

    return () => {
      media.removeEventListener('change', applyStoredMode);
      window.removeEventListener('storage', applyStoredMode);
      window.removeEventListener('simple-theme-change', applyStoredMode);
    };
  }, []);

  return null;
}
