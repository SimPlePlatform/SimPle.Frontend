'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'simple.theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme === 'light' ? '#F7F8FC' : '#0A0E18');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read the value the boot script set on <html> as the initial state.
  // The lazy initializer runs only on the client; on the server it falls
  // back to 'dark' (matching the boot script default).
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== 'undefined'
      ? ((document.documentElement.getAttribute('data-theme') as Theme) || 'dark')
      : 'dark'
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  // Follow system preference when no explicit choice is stored.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { /* ignore */ }
      setTheme(e.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme, isDark: theme === 'dark', isLight: theme === 'light', setTheme, toggleTheme,
  }), [theme, setTheme, toggleTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeCtx) ?? {
    theme: 'dark', isDark: true, isLight: false, setTheme: () => {}, toggleTheme: () => {},
  };
}
