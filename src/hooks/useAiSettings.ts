import { useState, useEffect, useCallback, useRef } from 'react';
import { AiSettings, AiProviderConfig } from '@/types';
import { type AiProvider } from '@/constants/ai';
import { LOCAL_STORAGE_KEYS } from '@/constants/storage';
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER, DEFAULT_AI_SETTINGS } from '@/constants/ai';

export function useAiSettings() {
  const isAiSettingsInitiallyLoaded = useRef(false);

  // Initialize AI settings from localStorage immediately (synchronously on first render)
  const getInitialAiSettings = (): AiSettings => {
    if (typeof window === 'undefined') {
      return DEFAULT_AI_SETTINGS;
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.AI_SETTINGS);
    if (!saved) {
      return DEFAULT_AI_SETTINGS;
    }

    try {
      const parsed = JSON.parse(saved);

      // Build providers config dynamically from all registered providers
      const providers: Record<AiProvider, AiProviderConfig> = {} as Record<AiProvider, AiProviderConfig>;

      for (const provider of Object.keys(AI_PROVIDERS) as AiProvider[]) {
        const providerDefault = AI_PROVIDERS[provider].defaultModel;
        const savedProvider = parsed.providers?.[provider];

        providers[provider] = {
          apiKey: savedProvider?.apiKey ?? '',
          model: savedProvider?.model ?? providerDefault,
        };
      }

      return {
        provider: parsed.provider ?? DEFAULT_AI_PROVIDER,
        providers,
        autoGenerate: parsed.autoGenerate ?? false,
        summaryLength: parsed.summaryLength ?? DEFAULT_AI_SETTINGS.summaryLength,
      };
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  };

  const initialAiSettings = getInitialAiSettings();
  const [aiSettings, setAiSettings] = useState<AiSettings>(initialAiSettings);

  // Helper to update a specific provider's config
  const updateProviderConfig = useCallback(<K extends keyof AiSettings['providers'][AiProvider]>(
    provider: AiProvider,
    key: K,
    value: AiSettings['providers'][AiProvider][K]
  ) => {
    setAiSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          [key]: value,
        },
      },
    }));
  }, []);

  // Save AI settings to localStorage (skip initial load to avoid overwriting)
  useEffect(() => {
    // Check if this is the first time saving after initial load
    // We check and set in the same statement to ensure thread safety
    if (!isAiSettingsInitiallyLoaded.current) {
      isAiSettingsInitiallyLoaded.current = true;
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_KEYS.AI_SETTINGS, JSON.stringify(aiSettings));
  }, [aiSettings]);

  return { aiSettings, setAiSettings, updateProviderConfig };
}
