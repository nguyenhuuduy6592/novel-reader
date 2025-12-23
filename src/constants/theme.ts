export interface ThemeOption {
  value: string;
  label: string;
}

export const BACKGROUND_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'night', label: 'Night' },
] as const;

export const FONT_OPTIONS = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans' },
  { value: 'monospace', label: 'Mono' },
] as const;

export const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 22, 24] as const;

export const LINE_HEIGHT_OPTIONS = [1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0] as const;

export const PADDING_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full' },
] as const;
