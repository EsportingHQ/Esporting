'use client';

import { useState, useEffect } from 'react';

export type Theme = 'system' | 'dark' | 'light' | 'dimmed';
export type ResolvedTheme = 'dark' | 'light' | 'dimmed';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    // Initial load
    try {
      const savedTheme = localStorage.getItem('esporting_theme') as Theme | null;
      if (savedTheme) {
        setThemeState(savedTheme);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const updateTheme = () => {
      let activeTheme: ResolvedTheme = 'dark';
      
      if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
        activeTheme = mediaQuery.matches ? 'light' : 'dark';
      } else {
        document.documentElement.setAttribute('data-theme', theme);
        activeTheme = theme as ResolvedTheme;
      }
      
      setResolvedTheme(activeTheme);

      // Update meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          activeTheme === 'light' ? '#FFFFFF' : '#000000'
        );
      }
    };

    updateTheme();

    if (theme === 'system') {
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem('esporting_theme', newTheme);
      setThemeState(newTheme);
    } catch (e) {}
  };

  return { theme, resolvedTheme, setTheme };
}
