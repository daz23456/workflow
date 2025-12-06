'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ColorTheme = 'ocean' | 'forest' | 'violet';

export const colorThemes: { id: ColorTheme; name: string; accent: string }[] = [
  { id: 'ocean', name: 'Ocean', accent: 'bg-blue-500' },
  { id: 'forest', name: 'Forest', accent: 'bg-emerald-500' },
  { id: 'violet', name: 'Violet', accent: 'bg-violet-500' },
];

interface ThemeState {
  theme: Theme;
  colorTheme: ColorTheme;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'ocean',
      setTheme: (theme: Theme) => set({ theme }),
      setColorTheme: (colorTheme: ColorTheme) => set({ colorTheme }),
    }),
    {
      name: 'theme-preference',
    }
  )
);

// Helper to get the resolved theme (handles 'system')
export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}
