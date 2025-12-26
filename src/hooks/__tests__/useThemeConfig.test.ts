import { renderHook, act } from '@testing-library/react'
import { useThemeConfig } from '@/hooks/useThemeConfig'
import { ReadingThemeConfig } from '@/types'
import { LOCAL_STORAGE_KEYS } from '@/constants/storage'

describe('useThemeConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads default theme config when no saved config exists', () => {
    const { result } = renderHook(() => useThemeConfig())

    expect(result.current.themeConfig).toEqual({
      background: 'sepia',
      fontFamily: 'sans-serif',
      fontSize: 18,
      lineHeight: 1.6,
      padding: 'compact'
    })
  })

  it('loads saved theme config from localStorage', () => {
    const savedConfig: ReadingThemeConfig = {
      background: 'dark',
      fontFamily: 'serif',
      fontSize: 20,
      lineHeight: 1.8,
      padding: 'wide'
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.READING_THEME, JSON.stringify(savedConfig))

    const { result } = renderHook(() => useThemeConfig())

    expect(result.current.themeConfig).toEqual(savedConfig)
  })

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.READING_THEME, 'invalid-json')

    const { result } = renderHook(() => useThemeConfig())

    expect(result.current.themeConfig).toEqual({
      background: 'sepia',
      fontFamily: 'sans-serif',
      fontSize: 18,
      lineHeight: 1.6,
      padding: 'compact'
    })
  })

  it('updates theme config and saves to localStorage', () => {
    const { result } = renderHook(() => useThemeConfig())

    act(() => {
      result.current.setThemeConfig({
        background: 'night',
        fontFamily: 'monospace',
        fontSize: 24,
        lineHeight: 2.0,
        padding: 'full'
      })
    })

    expect(result.current.themeConfig).toEqual({
      background: 'night',
      fontFamily: 'monospace',
      fontSize: 24,
      lineHeight: 2.0,
      padding: 'full'
    })

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.READING_THEME)
    expect(saved).toBeDefined()
    expect(JSON.parse(saved!)).toEqual({
      background: 'night',
      fontFamily: 'monospace',
      fontSize: 24,
      lineHeight: 2.0,
      padding: 'full'
    })
  })

  it('sets CSS custom properties when theme config changes', () => {
    const { result } = renderHook(() => useThemeConfig())

    act(() => {
      result.current.setThemeConfig({
        background: 'dark',
        fontFamily: 'serif',
        fontSize: 22,
        lineHeight: 1.7,
        padding: 'normal'
      })
    })

    expect(document.documentElement.style.getPropertyValue('--reading-font-size')).toBe('22px')
    expect(document.documentElement.style.getPropertyValue('--reading-line-height')).toBe('1.7')
    expect(document.documentElement.style.getPropertyValue('--reading-padding')).toBe('var(--padding-normal)')
    expect(document.documentElement.style.getPropertyValue('--reading-font-family')).toBe('var(--reading-font-serif)')
  })
})
