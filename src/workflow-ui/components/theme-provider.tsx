'use client';

import { useEffect } from 'react';
import { useThemeStore, getResolvedTheme } from '@/lib/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);
  const colorTheme = useThemeStore((state) => state.colorTheme);

  // Apply dark/light mode
  useEffect(() => {
    const root = document.documentElement;
    const resolved = getResolvedTheme(theme);

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Apply color theme
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', colorTheme);
  }, [colorTheme]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return <>{children}</>;
}
