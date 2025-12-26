'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getChapter, saveCurrentChapter, listChapters, saveChapterSummary } from '@/lib/indexedDB';
import { generateSummary as generateSummaryFromApi } from '@/lib/aiSummary';
import { ChapterInfo, ReadingThemeConfig, AiSettings, AiProviderConfig } from '@/types';
import { type AiProvider } from '@/constants/ai';
import { HomeIcon, ChevronLeftIcon, ChevronRightIcon, ThemeIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import { NavButton } from '@/components/NavButton';
import { ThemeSelect } from '@/components/ThemeSelect';
import OfflineIndicator from '@/components/OfflineIndicator';
import { AiSummary } from '@/components/AiSummary';
import {
  BACKGROUND_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  PADDING_OPTIONS,
} from '@/constants/theme';
import { LOCAL_STORAGE_KEYS } from '@/constants/storage';
import {
  AI_PROVIDERS,
  AI_SUMMARY_LENGTH_OPTIONS,
  DEFAULT_AI_SUMMARY_LENGTH,
  AI_PROVIDER_OPTIONS,
  DEFAULT_AI_PROVIDER,
  DEFAULT_AI_SETTINGS,
  type SummaryLength
} from '@/constants/ai';

export default function ChapterPage() {
  const params = useParams();
  const slug = params.slug as string;
  const chapterSlug = params.chapterSlug as string;
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeConfig, setThemeConfig] = useState<ReadingThemeConfig>({
    background: 'sepia',
    fontFamily: 'sans-serif',
    fontSize: 18,
    lineHeight: 1.6,
    padding: 'compact'
  });
  const [showSettings, setShowSettings] = useState(false);
  const loadingRef = useRef<string | null>(null);
  const autoGenerateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const isAiSettingsInitiallyLoaded = useRef(false);
  const currentChapterSlugRef = useRef<string>(chapterSlug);

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
        summaryLength: parsed.summaryLength ?? DEFAULT_AI_SUMMARY_LENGTH,
      };
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  };

  const initialAiSettings = getInitialAiSettings();

  // AI settings - single state object
  const [aiSettings, setAiSettings] = useState<AiSettings>(initialAiSettings);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  const loadChapter = useCallback(async (targetSlug: string, preFetchedChapter?: ChapterInfo | null) => {
    const requestId = `${slug}-${targetSlug}`;
    loadingRef.current = requestId;

    setIsLoading(true);
    setError(null);

    try {
      // Use pre-fetched chapter if provided, otherwise fetch
      const ch = preFetchedChapter !== undefined ? preFetchedChapter : await getChapter(slug, targetSlug);

      if (loadingRef.current !== requestId) {
        return;
      }

      if (ch) {
        setChapter(ch);
        currentChapterSlugRef.current = targetSlug;
        await saveCurrentChapter(slug, targetSlug);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError('Chapter not found');
      }
    } catch {
      if (loadingRef.current === requestId) {
        setError('Failed to load chapter');
      }
    } finally {
      if (loadingRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  // Navigate to next/prev chapter with index-based fallback
  const navigateChapter = useCallback(async (direction: 'next' | 'prev') => {
    if (!chapter) {
      return;
    }

    // Helper to build chapter URL
    const buildChapterUrl = (chapterSlug: string): string => `/novel/${slug}/chapter/${chapterSlug}`;

    const targetSlug = direction === 'next'
      ? chapter.nextChapter?.slug
      : chapter.prevChapter?.slug;

    if (!targetSlug) {
      return;
    }

    // Try loading by slug first
    const targetChapter = await getChapter(slug, targetSlug);

    if (targetChapter) {
      loadChapter(targetSlug, targetChapter);
      const newUrl = buildChapterUrl(targetSlug);
      window.history.pushState({ chapterSlug: targetSlug }, '', newUrl);
      return;
    }

    // Fallback: use chapter number-based navigation
    const allChapters = await listChapters(slug);

    // Extract chapter number from current slug (e.g., "chuong-15-..." -> 15)
    const currentSlug = chapter.chapter.slug ?? '';
    const currentMatch = currentSlug.match(/chuong-(\d+)/);
    if (!currentMatch) {
      return;
    }

    const currentNum = parseInt(currentMatch[1], 10);
    const targetNum = direction === 'next' ? currentNum + 1 : currentNum - 1;

    // Find the chapter with the target number
    const fallbackChapter = allChapters.find(c => {
      const slug = c.chapter.slug ?? '';
      const match = slug.match(/chuong-(\d+)/);
      return match ? parseInt(match[1], 10) === targetNum : false;
    });

    if (fallbackChapter) {
      const fallbackSlug = fallbackChapter.chapter.slug ?? '';
      if (!fallbackSlug) {
        return;
      }
      const storedChapterInfo = direction === 'next'
        ? chapter.nextChapter
        : chapter.prevChapter;
      console.info('[Navigation] Fallback: stored slug not found, calculated by chapter number instead', {
        direction,
        stored: { slug: targetSlug, name: storedChapterInfo?.name },
        loaded: { slug: fallbackSlug, name: fallbackChapter.chapter.name, number: targetNum },
      });
      loadChapter(fallbackSlug, fallbackChapter);
      const fallbackUrl = buildChapterUrl(fallbackSlug);
      window.history.pushState({ chapterSlug: fallbackSlug }, '', fallbackUrl);
    }
  }, [slug, chapter, loadChapter]);

  // Generate AI summary
  const generateSummary = useCallback(async () => {
    if (!chapter) {
      return;
    }

    const { provider, providers, summaryLength } = aiSettings;
    const { apiKey, model } = providers[provider];

    if (!apiKey) {
      setSummaryError(`Please set your ${AI_PROVIDERS[provider].label} API key in settings.`);
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      const summary = await generateSummaryFromApi({
        content: chapter.chapter.content,
        apiKey,
        provider,
        model,
        length: summaryLength,
      });

      // Save to IndexedDB
      await saveChapterSummary(slug, currentChapterSlugRef.current, summary);

      // Reload chapter to get the updated summary
      const updatedChapter = await getChapter(slug, currentChapterSlugRef.current);
      if (updatedChapter) {
        setChapter(updatedChapter);
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [chapter, aiSettings, slug]);

  // Auto-generate summary when chapter loads if enabled and no summary exists
  // Add 1s delay to avoid triggering for users quickly navigating through chapters
  useEffect(() => {
    // Clear any pending timeout when chapter changes or settings change
    if (autoGenerateTimeoutRef.current) {
      clearTimeout(autoGenerateTimeoutRef.current);
      autoGenerateTimeoutRef.current = null;
    }

    if (chapter && aiSettings.autoGenerate && !chapter.chapter.aiSummary) {
      const { apiKey } = aiSettings.providers[aiSettings.provider];
      if (!apiKey) return;
      autoGenerateTimeoutRef.current = setTimeout(() => {
        generateSummary();
        autoGenerateTimeoutRef.current = null;
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (autoGenerateTimeoutRef.current) {
        clearTimeout(autoGenerateTimeoutRef.current);
      }
    };
  }, [chapter, aiSettings, generateSummary]);

  useEffect(() => {
    currentChapterSlugRef.current = chapterSlug;
    loadChapter(chapterSlug);
  }, [slug, chapterSlug, loadChapter]);

  // Load theme config on mount (AI settings are loaded synchronously during initialization)
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
    // Mark AI settings as initially loaded to enable saving
    isAiSettingsInitiallyLoaded.current = true;
  }, []);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && chapter?.prevChapter?.slug) {
        navigateChapter('prev');
      } else if (e.key === 'ArrowRight' && chapter?.nextChapter?.slug) {
        navigateChapter('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, navigateChapter]);

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      // Extract chapter slug from URL since useParams doesn't update with pushState
      const pathParts = window.location.pathname.split('/');
      const newChapterSlug = pathParts[pathParts.length - 1];
      currentChapterSlugRef.current = newChapterSlug;
      loadChapter(newChapterSlug);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadChapter]);

  if (chapter === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
              <p className="text-gray-500 mt-4">Loading chapter...</p>
            </>
          ) : (
            <>
              <p className="text-red-500">{error || 'Chapter not found.'}</p>
            </>
          )}
          <br />
          <div className="flex gap-2 justify-center">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              <HomeIcon />
              Home
            </Link>
            <Link href={`/novel/${slug}`} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              <ChevronLeftIcon />
              Back to Novel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout padding="py-4 sm:py-8 sm:px-4">
      <OfflineIndicator />
      <div className="mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            <Link href="/" className="text-blue-500 hover:underline flex items-center gap-1 px-2 py-1">
              <HomeIcon />
              Home
            </Link>
            <Link href={`/novel/${slug}`} className="text-blue-500 hover:underline flex items-center gap-1">
              <ChevronLeftIcon />
              Novel
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <NavButton
              icon={<ThemeIcon />}
              onClick={() => setShowSettings(!showSettings)}
              ariaLabel={showSettings ? 'Hide settings' : 'Show settings'}
              ariaExpanded={showSettings}
              ariaControls="settings-panel"
            />
            {chapter.prevChapter?.slug && (
              <NavButton
                icon={<ChevronLeftIcon />}
                onClick={() => navigateChapter('prev')}
                ariaLabel="Previous chapter"
              />
            )}
            {chapter.nextChapter?.slug && (
              <NavButton
                icon={<ChevronRightIcon />}
                onClick={() => navigateChapter('next')}
                ariaLabel="Next chapter"
                className="mr-2"
              />
            )}
          </div>
        </div>

        {showSettings && (
          <div
            id="settings-panel"
            className="mb-6 p-4 bg-gray-100 rounded-lg animate-in slide-in-from-top-2 duration-200 ease-out"
          >
            <h3 className="font-bold mb-3 text-lg">Reading Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
              <ThemeSelect
                label="Background"
                value={themeConfig.background}
                onChange={(v) => setThemeConfig({ ...themeConfig, background: v as ReadingThemeConfig['background'] })}
                options={BACKGROUND_OPTIONS}
              />
              <ThemeSelect
                label="Font"
                value={themeConfig.fontFamily}
                onChange={(v) => setThemeConfig({ ...themeConfig, fontFamily: v as ReadingThemeConfig['fontFamily'] })}
                options={FONT_OPTIONS}
              />
              <ThemeSelect
                label="Size"
                value={themeConfig.fontSize}
                onChange={(v) => setThemeConfig({ ...themeConfig, fontSize: parseInt(v) })}
                options={FONT_SIZE_OPTIONS}
              />
              <ThemeSelect
                label="Line Height"
                value={themeConfig.lineHeight}
                onChange={(v) => setThemeConfig({ ...themeConfig, lineHeight: parseFloat(v) })}
                options={LINE_HEIGHT_OPTIONS}
              />
              <ThemeSelect
                label="Padding"
                value={themeConfig.padding}
                onChange={(v) => setThemeConfig({ ...themeConfig, padding: v as ReadingThemeConfig['padding'] })}
                options={PADDING_OPTIONS}
              />
            </div>

            <h4 className="font-bold mb-2 text-md mt-4">AI Summary Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <ThemeSelect
                label="AI Provider"
                value={aiSettings.provider}
                onChange={(v) => setAiSettings(prev => ({ ...prev, provider: v as AiProvider }))}
                options={AI_PROVIDER_OPTIONS}
              />
              <div>
                <label className="block mb-1 font-medium">{AI_PROVIDERS[aiSettings.provider].label} API Key</label>
                <input
                  type="password"
                  value={aiSettings.providers[aiSettings.provider].apiKey}
                  onChange={(e) => updateProviderConfig(aiSettings.provider, 'apiKey', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder={AI_PROVIDERS[aiSettings.provider].placeholder}
                />
              </div>
              <ThemeSelect
                label="AI Model"
                value={aiSettings.providers[aiSettings.provider].model}
                onChange={(v) => updateProviderConfig(aiSettings.provider, 'model', v)}
                options={AI_PROVIDERS[aiSettings.provider].modelOptions}
              />
              <ThemeSelect
                label="Summary Length"
                value={aiSettings.summaryLength}
                onChange={(v) => setAiSettings(prev => ({ ...prev, summaryLength: v as SummaryLength }))}
                options={AI_SUMMARY_LENGTH_OPTIONS}
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer p-2">
                  <input
                    type="checkbox"
                    checked={aiSettings.autoGenerate}
                    onChange={(e) => setAiSettings(prev => ({ ...prev, autoGenerate: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Auto-generate summary</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className={`reading-${themeConfig.background} sm:rounded-lg sm:shadow-md reading-content min-h-[50vh]`}>
          <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center pb-4 border-b border-current/20">
            {chapter.chapter.name}
          </h1>

          <AiSummary
            aiSettings={aiSettings}
            summary={chapter.chapter.aiSummary ?? null}
            isGenerating={isGeneratingSummary}
            error={summaryError}
            onGenerate={generateSummary}
          />

          <div
            className="prose prose-lg max-w-none"
            style={{
              fontFamily: 'var(--reading-font-family)',
              lineHeight: 'var(--reading-line-height)'
            }}
          >
            {chapter.chapter.content.split('\n').filter(Boolean).map((paragraph, index) => (
              <p key={index} dangerouslySetInnerHTML={{ __html: paragraph }} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {chapter.prevChapter?.slug && (
            <NavButton
              label="Previous Chapter"
              icon={<ChevronLeftIcon />}
              onClick={() => navigateChapter('prev')}
              ariaLabel="Previous chapter"
            />
          )}
          {chapter.nextChapter?.slug && (
            <NavButton
              label="Next Chapter"
              icon={<ChevronRightIcon />}
              onClick={() => navigateChapter('next')}
              ariaLabel="Next chapter"
            />
          )}
      </div>
    </PageLayout>
  );
}