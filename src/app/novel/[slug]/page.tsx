'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNovel, getCurrentChapter, listChapters, removeNovel, exportNovel, getChapter, saveChapterSummary, CurrentChapter, unmarkNovelCompleted } from '@/lib/indexedDB';
import { Novel, ChapterInfo, BatchGenerationState, AdaptiveConcurrencyState, ChapterProcessResult, DEFAULT_MAX_CONCURRENCY, ZAI_PROVIDER_ID } from '@/types';
import Image from 'next/image';
import { HomeIcon, TrashIcon, DownloadIcon, SparklesIcon, RefreshIcon, CheckIcon, BookOpenIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import { NavButton } from '@/components/NavButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AiSummaryBadge } from '@/components/AiSummaryBadge';
import { useAiSettings } from '@/hooks/useAiSettings';
import { useBatchTimer } from '@/hooks/useBatchTimer';
import { generateSummary } from '@/lib/aiSummary';
import { AI_PROVIDERS } from '@/constants/ai';
import { BatchProgress } from '@/components/BatchProgress';
import { BatchStats } from '@/components/BatchStats';

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

  // Batch size state (number of chapters to generate summaries for)
  const [batchSize, setBatchSize] = useState<number>(10);

  // Batch generation state
  const [batchGeneration, setBatchGeneration] = useState<BatchGenerationState>({
    isGenerating: false,
    currentIndex: 0,
    total: 0,
    error: null,
    cancelled: false,
    concurrency: 1,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Batch timer hook for tracking elapsed time and statistics
  const batchTimer = useBatchTimer();

  // Adaptive concurrency state (Z.ai only)
  const adaptiveConcurrencyRef = useRef<AdaptiveConcurrencyState>({
    currentLevel: 1,
    hasFailed: false,
    maxConcurrency: DEFAULT_MAX_CONCURRENCY,
    completedInBatch: 0,
  });

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

  const handleUnmarkCompleted = async () => {
    await unmarkNovelCompleted(slug);
    const n = await getNovel(slug);
    setNovel(n);
  };

  // Get visible chapters for batch generation (respects search filter and batch size limit)
  const getVisibleChaptersForBatch = (): ChapterInfo[] => {
    return chapters
      .filter((chapterInfo) =>
        chapterInfo.chapter.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, searchTerm ? undefined : batchSize);
  };

  // Process a single chapter - returns result object instead of using callbacks
  const processSingleChapter = useCallback(async (
    chapterInfo: ChapterInfo,
    signal: AbortSignal
  ): Promise<ChapterProcessResult> => {
    const { provider, providers, summaryLength } = aiSettings;
    const { apiKey, model } = providers[provider];

    const chapterSlug = chapterInfo.chapter.slug;
    const chapterName = chapterInfo.chapter.name;

    if (!chapterSlug) {
      return {
        success: false,
        chapterSlug: null,
        chapterName,
        error: 'No chapter slug',
      };
    }

    try {
      const fullChapter = await getChapter(slug, chapterSlug);
      if (!fullChapter) {
        return {
          success: false,
          chapterSlug: null,
          chapterName,
          error: 'Chapter not found',
        };
      }

      // Start timing this chapter
      batchTimer.startChapter(chapterSlug);

      const summary = await generateSummary({
        content: fullChapter.chapter.content,
        apiKey,
        provider,
        model,
        length: summaryLength,
        signal,
      });

      await saveChapterSummary(slug, chapterSlug, summary);

      return {
        success: true,
        chapterSlug,
        chapterName,
        summary,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err; // Re-throw abort to handle at batch level
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        chapterSlug: null,
        chapterName,
        error: errorMessage,
      };
    }
  }, [slug, aiSettings, batchTimer]);

  // Wait for all active requests to finish using Promise-based approach
  const createActiveRequestTracker = useCallback((): {
    waitForAll: () => Promise<void>;
    registerStart: () => void;
    registerCompletion: () => void;
    getCount: () => number;
  } => {
    let activeCount = 0;
    let resolveAll: (() => void) | null = null;
    let waitPromise: Promise<void> | null = null;

    return {
      waitForAll: () => {
        if (activeCount === 0) return Promise.resolve();
        if (!waitPromise) {
          waitPromise = new Promise<void>(resolve => {
            resolveAll = resolve;
          });
        }
        return waitPromise;
      },
      registerStart: () => {
        activeCount++;
      },
      registerCompletion: () => {
        activeCount--;
        if (activeCount === 0 && resolveAll) {
          resolveAll();
          resolveAll = null;
          waitPromise = null;
        }
      },
      getCount: () => activeCount,
    };
  }, []);

  // Process chapters sequentially (for non-Z.ai providers)
  const processChaptersSequentially = useCallback(async (
    chaptersToProcess: ChapterInfo[],
    abortSignal: AbortSignal
  ): Promise<string[]> => {
    const errors: string[] = [];
    let completedCount = 0;

    for (const chapterInfo of chaptersToProcess) {
      if (abortSignal.aborted) break;

      const result = await processSingleChapter(chapterInfo, abortSignal);

      if (result.success && result.chapterSlug && result.summary) {
        setChapters(prev =>
          prev.map(c =>
            c.chapter.slug === result.chapterSlug
              ? { ...c, chapter: { ...c.chapter, aiSummary: result.summary } }
              : c
          )
        );
        completedCount++;
        // Update success count in timer
        batchTimer.updateSuccess(completedCount);
        // Record the time this chapter completed
        batchTimer.recordSuccessTime(result.chapterSlug);
      } else {
        errors.push(`${result.chapterName}: ${result.error || 'Unknown error'}`);
      }

      // Update completed count in timer
      batchTimer.updateCompleted(completedCount + errors.length);

      setBatchGeneration(prev => ({
        ...prev,
        currentIndex: completedCount + errors.length,
      }));
    }

    return errors;
  }, [processSingleChapter, batchTimer]);

  // Process chapters with adaptive concurrency (for Z.ai provider)
  const processChaptersWithAdaptiveConcurrency = useCallback(async (
    chaptersToProcess: ChapterInfo[],
    abortSignal: AbortSignal
  ): Promise<string[]> => {
    const errors: string[] = [];
    const state = adaptiveConcurrencyRef.current;
    const processingQueue = [...chaptersToProcess];
    const results = new Map<string, { summary: string; chapterInfo: ChapterInfo }>();

    // Reset state
    state.currentLevel = 1;
    state.hasFailed = false;
    state.completedInBatch = 0;

    // Create tracker for active requests
    const tracker = createActiveRequestTracker();

    while (processingQueue.length > 0 && !abortSignal.aborted) {
      // If we had a failure, wait for all active requests before continuing
      if (state.hasFailed) {
        await tracker.waitForAll();
        if (abortSignal.aborted) break; // Check abort after waiting
        state.currentLevel = 1;
        state.hasFailed = false;
        setBatchGeneration(prev => ({ ...prev, concurrency: 1 }));
      }

      // Determine how many to start based on current concurrency level
      const concurrentBatchSize = Math.min(
        state.currentLevel,
        processingQueue.length
      );

      // Start concurrent requests
      const batchPromises: Promise<void>[] = [];

      for (let i = 0; i < concurrentBatchSize; i++) {
        if (processingQueue.length === 0) break;
        if (abortSignal.aborted) break;

        const chapterInfo = processingQueue.shift()!;

        const promise = (async () => {
          tracker.registerStart(); // Register that this request is starting
          try {
            const result = await processSingleChapter(chapterInfo, abortSignal);

            // Check abort before processing result
            if (abortSignal.aborted) {
              throw new Error('AbortError');
            }

            if (result.success && result.chapterSlug && result.summary) {
              results.set(result.chapterSlug, { summary: result.summary, chapterInfo });
              state.completedInBatch++;

              // Update success count in timer
              batchTimer.updateSuccess(results.size);

              // Update completed count in timer
              batchTimer.updateCompleted(results.size + errors.length);

              // Record the time this chapter completed
              batchTimer.recordSuccessTime(result.chapterSlug);

              // Update UI immediately on success
              if (!abortSignal.aborted) {
                setChapters(prev =>
                  prev.map(c =>
                    c.chapter.slug === result.chapterSlug
                      ? { ...c, chapter: { ...c.chapter, aiSummary: result.summary } }
                      : c
                  )
                );

                // Increment progress counter immediately
                setBatchGeneration(prev => ({
                  ...prev,
                  currentIndex: prev.currentIndex + 1,
                }));
              }
            } else {
              errors.push(`${result.chapterName}: ${result.error || 'Unknown error'}`);
              state.hasFailed = true;

              // Increment progress counter for failed chapters
              setBatchGeneration(prev => ({
                ...prev,
                currentIndex: prev.currentIndex + 1,
              }));
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              throw err;
            }
            errors.push(`${chapterInfo.chapter.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            state.hasFailed = true;
          } finally {
            tracker.registerCompletion();
          }
        })();

        batchPromises.push(promise);
      }

      // Wait for this batch to complete
      await Promise.allSettled(batchPromises);

      // Check for abort after batch completes
      if (abortSignal.aborted) break;

      // Adapt concurrency: increment on success
      if (!state.hasFailed && state.completedInBatch > 0) {
        state.currentLevel = Math.min(state.currentLevel + 1, state.maxConcurrency);
        const newConcurrency = state.currentLevel;

        // Update max concurrency in timer
        batchTimer.updateMaxConcurrency(newConcurrency);

        setBatchGeneration(prev => ({
          ...prev,
          concurrency: newConcurrency,
        }));
      }
    }

    return errors;
  }, [processSingleChapter, createActiveRequestTracker, batchTimer]);

  // Generate AI summaries for visible chapters with adaptive concurrency (Z.ai only)
  const generateBatchSummaries = useCallback(async (): Promise<void> => {
    const { provider, providers } = aiSettings;
    const { apiKey } = providers[provider];

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

    // Filter chapters that actually need processing
    const chaptersToProcess = visibleChapters.filter(
      c => c.chapter.slug && !c.chapter.aiSummary
    );

    if (chaptersToProcess.length === 0) {
      setBatchGeneration({
        isGenerating: false,
        currentIndex: visibleChapters.length,
        total: visibleChapters.length,
        error: 'All chapters already have summaries.',
        cancelled: false,
        concurrency: 1,
      });
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setBatchGeneration({
      isGenerating: true,
      currentIndex: 0,
      total: chaptersToProcess.length,
      error: null,
      cancelled: false,
      concurrency: 1,
    });

    const useAdaptiveConcurrency = provider === ZAI_PROVIDER_ID;

    // Start the batch timer
    batchTimer.start(chaptersToProcess.length, 1);

    try {
      const errors = useAdaptiveConcurrency
        ? await processChaptersWithAdaptiveConcurrency(chaptersToProcess, abortController.signal)
        : await processChaptersSequentially(chaptersToProcess, abortController.signal);

      // Stop the timer and calculate final stats
      batchTimer.stop();

      setBatchGeneration(prev => ({
        ...prev,
        isGenerating: false,
        error: errors.length > 0 ? errors.join('\n') : null,
      }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stop the timer and capture stats for cancellation
        batchTimer.stop();
        setBatchGeneration(prev => ({
          ...prev,
          isGenerating: false,
          cancelled: true,
        }));
      } else {
        batchTimer.stop();
        setBatchGeneration(prev => ({
          ...prev,
          isGenerating: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    }
  }, [slug, aiSettings, chapters, searchTerm, batchSize, processChaptersWithAdaptiveConcurrency, processChaptersSequentially, batchTimer]);

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
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <Image
              src={novel.book.coverUrl}
              alt={novel.book.name}
              width={200}
              height={300}
              className="w-48 h-72 object-cover rounded-lg shadow-md hover:opacity-90 transition-opacity duration-200"
              priority
              loading="eager"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-4 break-words">{novel.book.name}</h1>
            <p className="text-xl text-gray-600 mb-4">by {novel.book.author.name}</p>
            <div className="mb-6">
              <p className="text-lg text-gray-500 mb-2">
                {novel.book.chapterCount} chapters
              </p>
              {novel.completedAt && (
                <p className="text-sm px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium inline-flex items-center justify-center gap-1 mb-2">
                  <CheckIcon />
                  Completed
                </p>
              )}
              {!novel.completedAt && currentChapter?.chapterSlug && (
                <p className="text-sm px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium break-words" title={currentChapter.chapterName || ''}>
                  📖 Current: {currentChapter.chapterName || currentChapter?.chapterSlug ||''}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={currentChapter?.chapterSlug ? `/novel/${slug}/chapter/${currentChapter.chapterSlug}` : `/novel/${slug}/chapter/${chapters[0]?.chapter.slug || ''}`}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded text-sm text-white font-medium transition-colors w-full sm:w-fit cursor-pointer ${
                  currentChapter?.chapterSlug
                    ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                    : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                }`}
              >
                {currentChapter?.chapterSlug ? '📖 Continue Reading' : '🎯 Start Reading'}
              </Link>
              <Link
                href={`/novel/${slug}/quick-read`}
                aria-label={`Quick read ${novel.book.name} - view all chapter summaries`}
                title="Read all chapters with AI summaries in a scrollable view"
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded text-sm text-white font-medium transition-colors w-full sm:w-fit bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 focus:bg-indigo-700 cursor-pointer"
              >
                <BookOpenIcon />
                Quick Read
              </Link>
              {novel.completedAt && (
                <NavButton
                  icon={<RefreshIcon />}
                  label="Unmark Completed"
                  onClick={handleUnmarkCompleted}
                  ariaLabel="Unmark as completed"
                  className="px-3 py-1.5 rounded font-medium w-full sm:w-fit bg-amber-500 hover:bg-amber-600 active:bg-amber-700 focus:bg-amber-700"
                />
              )}
              {aiSettings.providers[aiSettings.provider]?.apiKey && (
                batchGeneration.isGenerating ? (
                  <NavButton
                    icon={<SparklesIcon />}
                    label="Generating..."
                    onClick={() => {}}
                    disabled={true}
                    ariaLabel="Generating summaries"
                    className="px-3 py-1.5 rounded font-medium w-full sm:w-fit bg-purple-500 disabled:bg-gray-400"
                  />
                ) : (
                  <details className="group relative">
                    <summary className="cursor-pointer flex items-center justify-center gap-2 px-3 py-1.5 rounded text-sm text-white font-medium transition-colors w-full sm:w-fit bg-purple-500 hover:bg-purple-600 active:bg-purple-700 focus:bg-purple-700 list-none">
                      <SparklesIcon />
                      <span>Generate Summaries ({batchSize === Infinity ? 'All' : batchSize})</span>
                      <span className="group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="absolute mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-fit">
                      <div className="p-1">
                        <div className="text-xs text-gray-500 px-2 py-1 font-medium">Select batch size:</div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBatchSize(10);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded transition-colors"
                        >
                          10 chapters
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBatchSize(100);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded transition-colors"
                        >
                          100 chapters
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBatchSize(1000);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded transition-colors"
                        >
                          1,000 chapters
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBatchSize(Infinity);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded transition-colors"
                        >
                          All chapters
                        </button>
                        <hr className="my-1 border-gray-200" />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            generateBatchSummaries();
                            (e.currentTarget.closest('details'))?.removeAttribute('open');
                          }}
                          className="block w-full text-left px-3 py-2 text-sm bg-purple-500 text-white hover:bg-purple-600 rounded transition-colors font-medium"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </details>
                )
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
              <BatchProgress
                timerState={batchTimer.state}
                isZaiProvider={aiSettings.provider === ZAI_PROVIDER_ID}
                onCancel={cancelBatchGeneration}
              />
            )}

            {/* Cancellation message */}
            {!batchGeneration.isGenerating && batchGeneration.cancelled && batchTimer.stats && (
              <BatchStats
                stats={batchTimer.stats}
                totalCount={batchGeneration.total}
                variant="cancelled"
              />
            )}

            {/* Error summary */}
            {!batchGeneration.isGenerating && batchGeneration.error && !batchGeneration.cancelled && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium mb-2">Generation completed with errors:</p>
                <pre className="text-red-700 text-sm whitespace-pre-wrap">{batchGeneration.error}</pre>
              </div>
            )}

            {/* Success message */}
            {!batchGeneration.isGenerating && !batchGeneration.error && batchGeneration.total > 0 && !batchGeneration.cancelled && batchTimer.stats && (
              <BatchStats
                stats={batchTimer.stats}
                totalCount={batchGeneration.total}
                variant="success"
              />
            )}

            <h2 className="text-lg font-bold mb-2">Chapters</h2>
            <div className="space-y-0.5">
              {chapters
                .filter((chapterInfo) =>
                  chapterInfo.chapter.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, searchTerm ? undefined : batchSize)
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
                      <AiSummaryBadge hasSummary={!!chapterInfo.chapter.aiSummary} showPlaceholder />
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
