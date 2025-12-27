'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateSummary as generateSummaryFromApi } from '@/lib/aiSummary';
import { saveChapterSummary } from '@/lib/indexedDB';
import { ChapterInfo } from '@/types';
import { HomeIcon, ChevronLeftIcon, ChevronRightIcon, ThemeIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import { NavButton } from '@/components/NavButton';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ChapterContent } from '@/components/ChapterContent';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useAiSettings } from '@/hooks/useAiSettings';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { AI_PROVIDERS } from '@/constants/ai';

export default function ChapterPage() {
  const params = useParams();
  const slug = params.slug as string;
  const chapterSlug = params.chapterSlug as string;

  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const autoGenerateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentChapterSlugRef = useRef<string>(chapterSlug);

  // Use custom hooks
  const { themeConfig, setThemeConfig } = useThemeConfig();
  const { aiSettings, setAiSettings, updateProviderConfig } = useAiSettings();

  // Chapter navigation hook - wrap callback in useCallback to prevent infinite reload loop
  const handleChapterChange = useCallback((ch: ChapterInfo | null) => {
    setChapter(ch);
    // Reset summary error when changing chapters
    setSummaryError(null);
    if (ch) {
      setIsLoading(false);
      setError(null);
      // Update the ref to track the current chapter for summary saving
      if (ch.chapter.slug) {
        currentChapterSlugRef.current = ch.chapter.slug;
      }
    } else {
      setIsLoading(false);
      setError('Chapter not found');
    }
  }, []);

  const { navigateChapter } = useChapterNavigation({
    slug,
    chapterSlug,
    onChapterChange: handleChapterChange,
  });

  // Generate AI summary
  const generateSummary = useCallback(async () => {
    if (!chapter) {
      return;
    }

    const { provider, providers, summaryLength, autoGenerate } = aiSettings;
    const { apiKey, model } = providers[provider];

    if (!apiKey) {
      setSummaryError(`Please set your ${AI_PROVIDERS[provider].label} API key in settings.`);
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryError(null);
    setGenerationTime(null);

    const startTime = performance.now();

    try {
      const summary = await generateSummaryFromApi({
        content: chapter.chapter.content,
        apiKey,
        provider,
        model,
        length: summaryLength,
      });

      const endTime = performance.now();
      setGenerationTime((endTime - startTime) / 1000);

      // Save to IndexedDB
      await saveChapterSummary(slug, currentChapterSlugRef.current, summary);

      // Reload chapter to get the updated summary
      // This will be handled by the navigation hook when we update the chapter state
      setChapter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chapter: {
            ...prev.chapter,
            aiSummary: summary,
          },
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      const timestamp = new Date().toLocaleString();
      setSummaryError(`${errorMessage}\n\n[${timestamp}]`);
      // Disable auto-generate on error to avoid repeated failures
      if (autoGenerate) {
        setAiSettings({ ...aiSettings, autoGenerate: false });
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [chapter, aiSettings, slug, setAiSettings]);

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
      }, 500);
    }

    // Cleanup on unmount
    return () => {
      if (autoGenerateTimeoutRef.current) {
        clearTimeout(autoGenerateTimeoutRef.current);
      }
    };
  }, [chapter, aiSettings, generateSummary]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && chapter?.prevChapter?.slug) {
        navigateChapter('prev', chapter);
      } else if (e.key === 'ArrowRight' && chapter?.nextChapter?.slug) {
        navigateChapter('next', chapter);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, navigateChapter]);

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
              onClick={() => navigateChapter('prev', chapter)}
              ariaLabel="Previous chapter"
            />
          )}
          {chapter.nextChapter?.slug && (
            <NavButton
              icon={<ChevronRightIcon />}
              onClick={() => navigateChapter('next', chapter)}
              ariaLabel="Next chapter"
              className="mr-2"
            />
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          themeConfig={themeConfig}
          onThemeConfigChange={setThemeConfig}
          aiSettings={aiSettings}
          onAiSettingsChange={setAiSettings}
          onProviderConfigUpdate={updateProviderConfig}
        />
      )}

      <ChapterContent
        chapter={chapter}
        themeConfig={themeConfig}
        aiSettings={aiSettings}
        isGeneratingSummary={isGeneratingSummary}
        summaryError={summaryError}
        onGenerateSummary={generateSummary}
        generationTime={generationTime}
      />

      <div className="mt-6 flex justify-center gap-2">
        {chapter.prevChapter?.slug && (
          <NavButton
            label="Previous Chapter"
            icon={<ChevronLeftIcon />}
            onClick={() => navigateChapter('prev', chapter)}
            ariaLabel="Previous chapter"
          />
        )}
        {chapter.nextChapter?.slug && (
          <NavButton
            label="Next Chapter"
            icon={<ChevronRightIcon />}
            onClick={() => navigateChapter('next', chapter)}
            ariaLabel="Next chapter"
          />
        )}
      </div>
    </PageLayout>
  );
}
