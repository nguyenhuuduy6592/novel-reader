import { renderHook, act } from '@testing-library/react'
import { useAiSettings } from '@/hooks/useAiSettings'
import { LOCAL_STORAGE_KEYS } from '@/constants/storage'
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, DEFAULT_AI_PROVIDER } from '@/constants/ai'

describe('useAiSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads default AI settings when no saved settings exist', () => {
    const { result } = renderHook(() => useAiSettings())

    expect(result.current.aiSettings).toEqual(DEFAULT_AI_SETTINGS)
  })

  it('loads saved AI settings from localStorage', () => {
    const savedSettings = {
      provider: 'google' as const,
      providers: {
        openrouter: { apiKey: 'sk-test', model: 'deepseek/deepseek-chat' },
        google: { apiKey: 'google-key', model: 'gemini-2.0-flash-exp' }
      },
      autoGenerate: true,
      summaryLength: 'medium' as const
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.AI_SETTINGS, JSON.stringify(savedSettings))

    const { result } = renderHook(() => useAiSettings())

    expect(result.current.aiSettings.provider).toBe('google')
    expect(result.current.aiSettings.autoGenerate).toBe(true)
    expect(result.current.aiSettings.summaryLength).toBe('medium')
  })

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AI_SETTINGS, 'invalid-json')

    const { result } = renderHook(() => useAiSettings())

    expect(result.current.aiSettings).toEqual(DEFAULT_AI_SETTINGS)
  })

  it('updates AI settings and saves to localStorage', () => {
    const { result } = renderHook(() => useAiSettings())

    act(() => {
      result.current.setAiSettings({
        ...result.current.aiSettings,
        autoGenerate: true,
        summaryLength: 'short'
      })
    })

    expect(result.current.aiSettings.autoGenerate).toBe(true)
    expect(result.current.aiSettings.summaryLength).toBe('short')

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.AI_SETTINGS)
    expect(saved).toBeDefined()
    const parsed = JSON.parse(saved!)
    expect(parsed.autoGenerate).toBe(true)
    expect(parsed.summaryLength).toBe('short')
  })

  it('updates provider config for specific provider', () => {
    const { result } = renderHook(() => useAiSettings())

    act(() => {
      result.current.updateProviderConfig('openrouter', 'apiKey', 'new-api-key')
    })

    expect(result.current.aiSettings.providers.openrouter.apiKey).toBe('new-api-key')
    expect(result.current.aiSettings.providers.google.apiKey).toBe('') // Unchanged
  })

  it('updates provider model for specific provider', () => {
    const { result } = renderHook(() => useAiSettings())

    act(() => {
      result.current.updateProviderConfig('google', 'model', 'gemini-2.0-flash-exp')
    })

    expect(result.current.aiSettings.providers.google.model).toBe('gemini-2.0-flash-exp')
  })

  it('preserves provider config when switching providers', () => {
    const { result } = renderHook(() => useAiSettings())

    // Set up OpenRouter API key
    act(() => {
      result.current.updateProviderConfig('openrouter', 'apiKey', 'openrouter-key')
    })

    // Switch to Google
    act(() => {
      result.current.setAiSettings({
        ...result.current.aiSettings,
        provider: 'google'
      })
    })

    expect(result.current.aiSettings.provider).toBe('google')
    expect(result.current.aiSettings.providers.openrouter.apiKey).toBe('openrouter-key')

    // Switch back to OpenRouter
    act(() => {
      result.current.setAiSettings({
        ...result.current.aiSettings,
        provider: 'openrouter'
      })
    })

    expect(result.current.aiSettings.provider).toBe('openrouter')
    expect(result.current.aiSettings.providers.openrouter.apiKey).toBe('openrouter-key')
  })
})
