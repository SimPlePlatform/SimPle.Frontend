'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'simple.theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in private browsing or locked-down contexts.
  }

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme === 'light' ? '#F7F8FC' : '#0A0E18');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!media) return;

    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        return;
      }
      setTheme(event.matches ? 'light' : 'dark');
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [setTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    toggleTheme,
  }), [setTheme, theme, toggleTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeCtx) ?? {
    theme: 'dark',
    isDark: true,
    isLight: false,
    setTheme: () => {},
    toggleTheme: () => {},
  };
}
