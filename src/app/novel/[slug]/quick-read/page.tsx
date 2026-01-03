'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getNovel, getCurrentChapter, listChapters, saveCurrentChapter } from '@/lib/indexedDB';
import { Novel, ChapterInfo, CurrentChapter } from '@/types';
import { HomeIcon, ChevronLeftIcon, ThemeIcon, BookOpenIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import { NavButton } from '@/components/NavButton';
import { ChapterSummaryCard } from '@/components/ChapterSummaryCard';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useAiSettings } from '@/hooks/useAiSettings';

// Constants for magic numbers
const SCROLL_DELAY_MS = 100
const SAVE_DEBOUNCE_MS = 500
const SCROLL_MAX_RETRIES = 3

export default function QuickReadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [currentChapterSlug, setCurrentChapterSlug] = useState<string | null>(null);
  const [visibleChapterSlug, setVisibleChapterSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chaptersRef = useRef<ChapterInfo[]>([]);

  const { themeConfig, setThemeConfig } = useThemeConfig();
  const { aiSettings, setAiSettings, updateProviderConfig } = useAiSettings();

  // Keep chaptersRef in sync with chapters state
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const n = await getNovel(slug);
        if (!n) {
          setError('Novel not found');
          setIsLoading(false);
          return;
        }
        setNovel(n);

        const chaptersList = await listChapters(slug);
        setChapters(chaptersList);

        const cc = await getCurrentChapter(slug);
        if (cc) {
          setCurrentChapterSlug(cc.chapterSlug);
          setVisibleChapterSlug(cc.chapterSlug);
        }

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load novel');
        setIsLoading(false);
      }
    };
    loadData();
  }, [slug]);

  // Scroll to current chapter after data loads with retry mechanism
  useEffect(() => {
    if (!isLoading && chapters.length > 0 && currentChapterSlug) {
      let retries = 0;

      const scrollToChapter = () => {
        const element = document.getElementById(`chapter-${currentChapterSlug}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (retries < SCROLL_MAX_RETRIES) {
          retries++;
          setTimeout(scrollToChapter, SCROLL_DELAY_MS);
        }
      };

      const timeoutId = setTimeout(scrollToChapter, SCROLL_DELAY_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, chapters, currentChapterSlug]);

  // Intersection Observer callback - uses chaptersRef to avoid stale closures
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const chapterSlug = entry.target.id.replace('chapter-', '');
        // Validate chapterSlug is not empty
        if (chapterSlug && chapterSlug.length > 0) {
          setVisibleChapterSlug(chapterSlug);

          // Cancel any pending save
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }

          // Debounced save to IndexedDB with error handling
          saveTimeoutRef.current = setTimeout(async () => {
            try {
              const chapter = chaptersRef.current.find((c) => c.chapter.slug === chapterSlug);
              if (chapter) {
                await saveCurrentChapter(slug, chapterSlug, chapter.chapter.name);
              }
            } catch (err) {
              console.error('Failed to save current chapter:', err);
            } finally {
              saveTimeoutRef.current = null;
            }
          }, SAVE_DEBOUNCE_MS);
        }
      }
    });
  }, [slug]); // Only depend on slug, not chapters

  // Set up Intersection Observer
  useEffect(() => {
    if (chapters.length === 0) return;

    // Small delay to ensure DOM is rendered before observing elements
    const timeoutId = setTimeout(() => {
      // Observer to detect when chapter is in center of viewport
      // Negative margins on both sides creates a "trigger zone" in the middle 50%
      observerRef.current = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0,
      });

      chapters.forEach((chapter) => {
        const element = document.getElementById(`chapter-${chapter.chapter.slug}`);
        if (element) {
          observerRef.current?.observe(element);
        }
      });
    }, SCROLL_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      observerRef.current?.disconnect();
      // Also cancel any pending save when observer is recreated
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [chapters, handleIntersection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
          <p className="text-gray-500 mt-4">Loading quick read...</p>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'Novel not found'}</p>
          <br />
          <NavButton
            icon={<HomeIcon />}
            label="Home"
            onClick={() => router.push('/')}
            ariaLabel="Go to home"
          />
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No chapters found</p>
          <br />
          <Link
            href={`/novel/${slug}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <ChevronLeftIcon />
            Back to Novel
          </Link>
        </div>
      </div>
    );
  }

  const visibleChapterIndex = visibleChapterSlug
    ? chapters.findIndex((c) => c.chapter.slug === visibleChapterSlug) + 1
    : null

  return (
    <>
      <PageLayout maxWidth="max-w-3xl" padding="py-4 sm:py-8 sm:px-4">
        {/* Header Navigation */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpenIcon />
              Quick Read
            </h1>
            <NavButton
              icon={<ThemeIcon />}
              onClick={() => setShowSettings(!showSettings)}
              ariaLabel={showSettings ? 'Hide settings' : 'Show settings'}
              ariaExpanded={showSettings}
              ariaControls="settings-panel"
            />
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

        {/* Novel Info Card */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <h2 className="font-bold text-lg text-blue-900">{novel.book.name}</h2>
          <p className="text-blue-700 text-sm">by {novel.book.author.name}</p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-blue-600 text-sm">
              {visibleChapterSlug ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Reading: Ch {visibleChapterIndex}
                </span>
              ) : (
                <span className="text-gray-500">Start scrolling to track progress</span>
              )}
            </p>
            <p className="text-blue-600 text-sm">
              {novel.book.chapterCount} chapters • {chapters.filter((c) => c.chapter.aiSummary).length} with AI summaries
            </p>
          </div>
        </div>

        {/* Chapter List */}
        <div className="space-y-4 pb-20">
          {chapters.map((chapterInfo, index) => (
            <ChapterSummaryCard
              key={chapterInfo.chapter.slug}
              slug={slug}
              chapter={chapterInfo}
              isActive={visibleChapterSlug === chapterInfo.chapter.slug}
              index={index}
              themeConfig={themeConfig}
            />
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center pb-20">
          <p className="text-gray-500 text-sm">
            Scroll to track your reading progress • Click chapter to read full content
          </p>
        </div>
      </PageLayout>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-10">
        <div className="flex divide-x divide-gray-200">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HomeIcon />
            Home
          </Link>
          <Link
            href={`/novel/${slug}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BookOpenIcon />
            Novel
          </Link>
        </div>
      </div>

      {/* Desktop Bottom Navigation */}
      <div className="hidden md:flex fixed bottom-4 left-1/2 -translate-x-1/2 gap-2 z-10">
        <NavButton
          icon={<HomeIcon />}
          label="Home"
          onClick={() => router.push('/')}
          ariaLabel="Go to home"
          className="shadow-lg"
        />
        <NavButton
          icon={<BookOpenIcon />}
          label="Novel"
          onClick={() => router.push(`/novel/${slug}`)}
          ariaLabel="Back to novel"
          className="shadow-lg"
        />
      </div>
    </>
  );
}
