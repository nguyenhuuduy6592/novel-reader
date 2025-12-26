import { useState, useEffect, useRef } from 'react';
import { ReadingThemeConfig } from '@/types';
import { LOCAL_STORAGE_KEYS } from '@/constants/storage';

const DEFAULT_THEME: ReadingThemeConfig = {
  background: 'sepia',
  fontFamily: 'sans-serif',
  fontSize: 18,
  lineHeight: 1.6,
  padding: 'compact'
};

export function useThemeConfig() {
  const isInitialMount = useRef(true);
  const [themeConfig, setThemeConfig] = useState<ReadingThemeConfig>(DEFAULT_THEME);

  // Load theme config on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.READING_THEME);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThemeConfig(parsed);
      } catch {
        // Invalid JSON, use defaults
      }
    }

    // Mark initial mount complete after loading
    isInitialMount.current = false;
  }, []);

  // Apply theme config to DOM and save to localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      return; // Skip saving on initial load
    }

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
