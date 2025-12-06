'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useThemeStore, getResolvedTheme, colorThemes, type ColorTheme } from '@/lib/theme-store';

function ColorThemePicker() {
  const { colorTheme, setColorTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const currentTheme = colorThemes.find(t => t.id === colorTheme) || colorThemes[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
        aria-label="Select color theme"
        title={`Theme: ${currentTheme.name}`}
      >
        <div className={`w-4 h-4 rounded-full ${currentTheme.accent}`} />
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {colorThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setColorTheme(theme.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  colorTheme === theme.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${theme.accent}`} />
                <span className="text-sm text-gray-700 dark:text-gray-200">{theme.name}</span>
                {colorTheme === theme.id && (
                  <svg className="w-4 h-4 ml-auto text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    setResolvedTheme(getResolvedTheme(theme));
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedTheme(getResolvedTheme(theme));
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const cycleTheme = () => {
    // Cycle: system -> light -> dark -> system
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Theme: ${theme}`}
      title={`Mode: ${theme}`}
    >
      {theme === 'system' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ) : resolvedTheme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  const linkClasses = (path: string) => {
    const base = 'px-3 py-2 theme-rounded-md text-sm font-medium transition-all';
    const active = 'theme-accent text-white theme-shadow-sm';
    const inactive = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:theme-accent-text';

    return `${base} ${isActive(path) ? active : inactive}`;
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            <Link href="/" className="flex items-center space-x-2 mr-8">
              <div className="w-8 h-8 theme-accent theme-rounded-md theme-shadow-sm flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl text-gray-900 dark:text-white theme-font-heading">Workflow</span>
            </Link>

            <Link href="/dashboard" className={linkClasses('/dashboard')}>
              Dashboard
            </Link>

            <Link href="/workflows" className={linkClasses('/workflows')}>
              Workflows
            </Link>

            <Link href="/templates" className={linkClasses('/templates')}>
              Templates
            </Link>

            <Link href="/tasks" className={linkClasses('/tasks')}>
              Tasks
            </Link>

            <Link href="/visualization" className={linkClasses('/visualization')}>
              Visualization
            </Link>

            <Link href="/playground" className={linkClasses('/playground')}>
              Playground
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <ColorThemePicker />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
