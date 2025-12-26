import { useState, useEffect } from 'react';
import { ReadingThemeConfig } from '@/types';
import { LOCAL_STORAGE_KEYS } from '@/constants/storage';

const DEFAULT_THEME: ReadingThemeConfig = {
  background: 'sepia',
  fontFamily: 'sans-serif',
  fontSize: 18,
  lineHeight: 1.6,
  padding: 'compact'
};

// Initialize theme from localStorage (called once during initial render)
function getInitialTheme(): ReadingThemeConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.READING_THEME);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed;
    } catch {
      return DEFAULT_THEME;
    }
  }
  return DEFAULT_THEME;
}

export function useThemeConfig() {
  const [themeConfig, setThemeConfig] = useState<ReadingThemeConfig>(getInitialTheme);

  // Apply theme config to DOM and save to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.READING_THEME, JSON.stringify(themeConfig));
    document.documentElement.style.setProperty('--reading-font-size', `${themeConfig.fontSize}px`);
    document.documentElement.style.setProperty('--reading-line-height', `${themeConfig.lineHeight}`);
    document.documentElement.style.setProperty('--reading-padding', `var(--padding-${themeConfig.padding})`);

    // Set font family
    const fontMap: Record<string, string> = {
      'serif': 'var(--reading-font-serif)',
      'sans-serif': 'var(--reading-font-sans)',
      'monospace': 'var(--reading-font-mono)'
    };
    document.documentElement.style.setProperty('--reading-font-family', fontMap[themeConfig.fontFamily]);
  }, [themeConfig]);

  return { themeConfig, setThemeConfig };
}
