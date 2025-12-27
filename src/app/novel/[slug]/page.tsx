'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNovel, getCurrentChapter, listChapters, removeNovel, exportNovel, getChapter, saveChapterSummary, CurrentChapter } from '@/lib/indexedDB';
import { Novel, ChapterInfo } from '@/types';
import Image from 'next/image';
import { HomeIcon, TrashIcon, DownloadIcon, SparklesIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import { NavButton } from '@/components/NavButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAiSettings } from '@/hooks/useAiSettings';
import { generateSummary } from '@/lib/aiSummary';
import { AI_PROVIDERS } from '@/constants/ai';

export default function NovelPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [currentChapter, setCurrentChapter] = useState<CurrentChapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // AI settings
  const { aiSettings } = useAiSettings();

  // Batch generation state
  const [batchGeneration, setBatchGeneration] = useState<{
    isGenerating: boolean;
    currentIndex: number;
    total: number;
    error: string | null;
    cancelled: boolean;
  }>({
    isGenerating: false,
    currentIndex: 0,
    total: 0,
    error: null,
    cancelled: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadNovel = async () => {
      const n = await getNovel(slug);
      setNovel(n);
      const chaptersList = await listChapters(slug);
      setChapters(chaptersList);
      const currentChapter = await getCurrentChapter(slug);
      setCurrentChapter(currentChapter);
      setIsLoading(false);
    };
    loadNovel();
  }, [slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleDeleteNovel = async () => {
    if (!novel) return;
    setIsDeleting(true);
    try {
      await removeNovel(slug);
      router.push('/');
    } catch (error) {
      alert('Failed to remove novel. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleExportNovel = async () => {
    if (!novel) return;
    try {
      const exportedNovel = await exportNovel(slug);
      if (!exportedNovel) {
        alert('Failed to export novel.');
        return;
      }

      // Create a blob and download it
      const json = JSON.stringify(exportedNovel, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.book.slug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export novel. Please try again.');
    }
  };

  // Get visible chapters for batch generation (respects search filter and 10-item limit)
  const getVisibleChaptersForBatch = (): ChapterInfo[] => {
    return chapters
      .filter((chapterInfo) =>
        chapterInfo.chapter.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, searchTerm ? undefined : 10);
  };

  // Generate AI summaries for visible chapters
  const generateBatchSummaries = useCallback(async (): Promise<void> => {
    const { provider, providers, summaryLength } = aiSettings;
    const { apiKey, model } = providers[provider];

    if (!apiKey) {
      setBatchGeneration(prev => ({
        ...prev,
        error: `Please set your ${AI_PROVIDERS[provider].label} API key in settings.`,
      }));
      return;
    }

    const visibleChapters = getVisibleChaptersForBatch();

    if (visibleChapters.length === 0) {
      setBatchGeneration(prev => ({
        ...prev,
        error: 'No chapters to process.',
      }));
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setBatchGeneration({
      isGenerating: true,
      currentIndex: 0,
      total: visibleChapters.length,
      error: null,
      cancelled: false,
    });

    const errors: string[] = [];

    for (let i = 0; i < visibleChapters.length; i++) {
      if (abortController.signal.aborted) {
        setBatchGeneration(prev => ({
          ...prev,
          isGenerating: false,
          cancelled: true,
        }));
        break;
      }

      const chapterInfo = visibleChapters[i];
      const chapterSlug = chapterInfo.chapter.slug;

      // Skip if no slug or already has summary
      if (!chapterSlug || chapterInfo.chapter.aiSummary) {
        setBatchGeneration(prev => ({
          ...prev,
          currentIndex: i + 1,
        }));
        continue;
      }

      // Check abort before starting async work
      if (abortController.signal.aborted) break;

      try {
        const fullChapter = await getChapter(slug, chapterSlug);

        // Check abort after fetch
        if (abortController.signal.aborted) break;

        if (!fullChapter) {
          errors.push(`Chapter ${chapterInfo.chapter.name} not found`);
          setBatchGeneration(prev => ({
            ...prev,
            currentIndex: i + 1,
          }));
          continue;
        }

        const summary = await generateSummary({
          content: fullChapter.chapter.content,
          apiKey,
          provider,
          model,
          length: summaryLength,
          signal: abortController.signal,
        });

        // Check abort after API call
        if (abortController.signal.aborted) break;

        await saveChapterSummary(slug, chapterSlug, summary);

        // Check abort after save
        if (abortController.signal.aborted) break;

        setChapters(prevChapters =>
          prevChapters.map(c =>
            c.chapter.slug === chapterSlug
              ? {
                  ...c,
                  chapter: {
                    ...c.chapter,
                    aiSummary: summary,
                  },
                }
              : c
          )
        );
      } catch (err) {
        // Check if error was due to abort
        if (abortController.signal.aborted) break;

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${chapterInfo.chapter.name}: ${errorMessage}`);
      }

      setBatchGeneration(prev => ({
        ...prev,
        currentIndex: i + 1,
      }));
    }

    abortControllerRef.current = null;

    setBatchGeneration(prev => ({
      ...prev,
      isGenerating: false,
      error: errors.length > 0 ? errors.join('\n') : null,
    }));
  }, [slug, aiSettings, chapters, searchTerm]);

  // Cancel batch generation
  const cancelBatchGeneration = useCallback((): void => {
    abortControllerRef.current?.abort();
  }, []);

  // Escape key to cancel batch generation
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && batchGeneration.isGenerating) {
        cancelBatchGeneration();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [batchGeneration.isGenerating, cancelBatchGeneration]);

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <p className="text-gray-500">Loading novel...</p>
          ) : (
            <p className="text-red-500">Novel not found.</p>
          )}
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

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="hidden sm:block text-3xl font-bold">Novel Details</h1>
        <div className="flex gap-2">
          <NavButton
            icon={<HomeIcon />}
            label="Home"
            onClick={() => router.push('/')}
            ariaLabel="Go to home"
          />
          <NavButton
            label="Export"
            icon={<DownloadIcon />}
            onClick={handleExportNovel}
            ariaLabel="Export novel"
            className="bg-green-500 hover:bg-green-600 active:bg-green-700 focus:bg-green-700"
          />
          <NavButton
            label="Remove"
            icon={<TrashIcon />}
            onClick={() => setShowDeleteDialog(true)}
            ariaLabel="Remove novel"
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 focus:bg-red-700"
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Remove Novel"
        message={
          <>
            Are you sure you want to remove <strong>{novel.book.name}</strong>? This action cannot be undone.
          </>
        }
        confirmText="Remove Novel"
        cancelText="Cancel"
        isProcessing={isDeleting}
        processingText="Removing..."
        onConfirm={handleDeleteNovel}
        onCancel={() => setShowDeleteDialog(false)}
        variant="danger"
      />

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <Image
              src={novel.book.coverUrl}
              alt={novel.book.name}
              width={200}
              height={300}
              className="w-48 h-72 object-cover rounded-lg shadow-md hover:opacity-90 transition-opacity duration-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-4 break-words">{novel.book.name}</h1>
            <p className="text-xl text-gray-600 mb-4">by {novel.book.author.name}</p>
            <div className="mb-6">
              <p className="text-lg text-gray-500 mb-2">
                {novel.book.chapterCount} chapters
              </p>
              {currentChapter?.chapterSlug && (
                <p className="text-sm px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium break-words" title={currentChapter.chapterName || ''}>
                  📖 Current: {currentChapter.chapterName || currentChapter?.chapterSlug ||''}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={currentChapter?.chapterSlug ? `/novel/${slug}/chapter/${currentChapter.chapterSlug}` : `/novel/${slug}/chapter/${chapters[0]?.chapter.slug || ''}`}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm text-white font-semibold text-lg transition-colors w-full sm:w-fit cursor-pointer ${
                  currentChapter?.chapterSlug
                    ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                    : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                }`}
              >
                {currentChapter?.chapterSlug ? '📖 Continue Reading' : '🎯 Start Reading'}
              </Link>
              {aiSettings.providers[aiSettings.provider]?.apiKey && (
                <NavButton
                  icon={<SparklesIcon />}
                  label={batchGeneration.isGenerating ? 'Generating...' : 'Generate Summaries'}
                  onClick={generateBatchSummaries}
                  disabled={batchGeneration.isGenerating}
                  ariaLabel="Generate AI summaries for visible chapters"
                  className="px-6 py-3 rounded-lg font-semibold w-full sm:w-fit bg-purple-500 hover:bg-purple-600 active:bg-purple-700 focus:bg-purple-700 disabled:bg-gray-400"
                />
              )}
            </div>
          </div>
        </div>

        {chapters && chapters.length > 0 && (
          <div className="mt-4">
            <div className="mb-3">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chapters..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Progress during generation */}
            {batchGeneration.isGenerating && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-purple-800 font-medium">
                    Generating summaries: {batchGeneration.currentIndex}/{batchGeneration.total}
                  </span>
                </div>
                <button
                  onClick={cancelBatchGeneration}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Cancellation message */}
            {!batchGeneration.isGenerating && batchGeneration.cancelled && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">Generation cancelled at {batchGeneration.currentIndex}/{batchGeneration.total}</p>
              </div>
            )}

            {/* Error summary */}
            {!batchGeneration.isGenerating && batchGeneration.error && !batchGeneration.cancelled && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium mb-2">Generation completed with errors:</p>
                <pre className="text-red-700 text-sm whitespace-pre-wrap">{batchGeneration.error}</pre>
              </div>
            )}

            {/* Success message */}
            {!batchGeneration.isGenerating && !batchGeneration.error && batchGeneration.total > 0 && !batchGeneration.cancelled && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  Successfully generated {batchGeneration.currentIndex}/{batchGeneration.total} summaries!
                </p>
              </div>
            )}

            <h2 className="text-lg font-bold mb-2">Chapters</h2>
            <div className="space-y-0.5">
              {chapters
                .filter((chapterInfo) =>
                  chapterInfo.chapter.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, searchTerm ? undefined : 10)
                .map((chapterInfo) => {
                  const actualIndex = chapters.findIndex(c => c.chapter.slug === chapterInfo.chapter.slug) ?? 0;
                  return (
                <Link
                  key={chapterInfo.chapter.slug}
                  href={`/novel/${slug}/chapter/${chapterInfo.chapter.slug}`}
                  className="block p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-xs"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {chapterInfo.chapter.aiSummary ? (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold" title="AI summary available">
                          AI
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-block w-5 h-5"></span>
                      )}
                      <span className="font-medium truncate">Ch {actualIndex + 1}: {chapterInfo.chapter.name}</span>
                    </div>
                    <span className="text-gray-500 text-xs flex-shrink-0">→</span>
                  </div>
                </Link>
              );
                })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}