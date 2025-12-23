'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getChapter, getNovel, saveCurrentChapter } from '@/lib/indexedDB';
import { ChapterInfo, ReadingThemeConfig } from '@/types';
import { HomeIcon, ChevronLeftIcon, ChevronRightIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';

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

  const loadChapter = useCallback(async (targetSlug: string) => {
    // Cancel if this request is stale
    const requestId = `${slug}-${targetSlug}`;
    loadingRef.current = requestId;

    setIsLoading(true);
    setError(null);

    try {
      const ch = await getChapter(slug, targetSlug);

      // Check if this request is still valid
      if (loadingRef.current !== requestId) return;

      if (ch) {
        setChapter(ch);
        await saveCurrentChapter(slug, targetSlug);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Fall back to getNovel for backwards compatibility with old data
        const novel = await getNovel(slug);
        if (loadingRef.current !== requestId) return;

        if (novel && novel.chapters) {
          const foundChapter = novel.chapters.find(c => c.chapter.slug === targetSlug);
          if (foundChapter) {
            setChapter(foundChapter);
            await saveCurrentChapter(slug, targetSlug);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setError('Chapter not found');
          }
        } else {
          setError('Novel not found');
        }
      }
    } catch (err) {
      if (loadingRef.current === requestId) {
        setError('Failed to load chapter');
      }
    } finally {
      if (loadingRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    loadChapter(chapterSlug);
  }, [slug, chapterSlug, loadChapter]);



  // Load/save theme config
  useEffect(() => {
    const saved = localStorage.getItem('readingTheme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setThemeConfig(parsed);
      } catch {
        // invalid json, use default
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('readingTheme', JSON.stringify(themeConfig));
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && chapter?.prevChapter?.slug) {
        loadChapter(chapter.prevChapter.slug);
      } else if (e.key === 'ArrowRight' && chapter?.nextChapter?.slug) {
        loadChapter(chapter.nextChapter.slug);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, loadChapter]);

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
    <PageLayout padding="pb-4 sm:py-8 sm:px-4">
      <div className="mb-6 flex justify-between items-center">
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
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer text-sm"
              aria-expanded={showSettings}
              aria-controls="settings-panel"
            >
              {showSettings ? 'Hide' : 'Theme'}
            </button>
            {chapter.prevChapter?.slug && (
              <button
                onClick={() => loadChapter(chapter.prevChapter!.slug!)}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 focus:bg-gray-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous chapter"
              >
                Previous
              </button>
            )}
            {chapter.nextChapter?.slug && (
              <button
                onClick={() => loadChapter(chapter.nextChapter!.slug!)}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 focus:bg-gray-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next chapter"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {showSettings && (
          <div
            id="settings-panel"
            className="mb-6 p-4 bg-gray-100 rounded-lg animate-in slide-in-from-top-2 duration-200 ease-out"
          >
            <h3 className="font-bold mb-3 text-lg">Reading Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <label className="block mb-1 font-medium">Background</label>
                <select
                  value={themeConfig.background}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    background: e.target.value as ReadingThemeConfig['background']
                  })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="sepia">Sepia</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Font</label>
                <select
                  value={themeConfig.fontFamily}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    fontFamily: e.target.value as ReadingThemeConfig['fontFamily']
                  })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="serif">Serif</option>
                  <option value="sans-serif">Sans</option>
                  <option value="monospace">Mono</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Size</label>
                <select
                  value={themeConfig.fontSize}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    fontSize: parseInt(e.target.value)
                  })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                  <option value={20}>20px</option>
                  <option value={22}>22px</option>
                  <option value={24}>24px</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Line Height</label>
                <select
                  value={themeConfig.lineHeight}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    lineHeight: parseFloat(e.target.value)
                  })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={1.2}>1.2</option>
                  <option value={1.4}>1.4</option>
                  <option value={1.5}>1.5</option>
                  <option value={1.6}>1.6</option>
                  <option value={1.7}>1.7</option>
                  <option value={1.8}>1.8</option>
                  <option value={2.0}>2.0</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Padding</label>
                <select
                  value={themeConfig.padding}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    padding: e.target.value as ReadingThemeConfig['padding']
                  })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                  <option value="full">Full</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className={`reading-${themeConfig.background} sm:rounded-lg sm:shadow-md reading-content min-h-[50vh] ${isLoading ? 'opacity-50' : ''}`}>
          <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center pb-4 border-b border-current/20">
            {chapter.chapter.name}
          </h1>

          <div
            className="prose prose-lg max-w-none [&>p]:mb-6"
            style={{
              fontFamily: 'var(--reading-font-family)',
              lineHeight: 'var(--reading-line-height)'
            }}
            dangerouslySetInnerHTML={{ __html: chapter.chapter.content }}
          />
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {chapter.prevChapter?.slug && (
            <button
              onClick={() => loadChapter(chapter.prevChapter!.slug!)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous chapter"
            >
              <ChevronLeftIcon />
              Previous Chapter
            </button>
          )}
          {chapter.nextChapter?.slug && (
            <button
              onClick={() => loadChapter(chapter.nextChapter!.slug!)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next chapter"
            >
              Next Chapter
              <ChevronRightIcon />
            </button>
          )}
      </div>
    </PageLayout>
  );
}