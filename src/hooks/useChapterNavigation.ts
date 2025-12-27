import { useEffect, useCallback, useRef } from 'react';
import { ChapterInfo } from '@/types';
import { getChapter, saveCurrentChapter, listChapters } from '@/lib/indexedDB';

interface UseChapterNavigationProps {
  slug: string;
  chapterSlug: string;
  onChapterChange?: (chapter: ChapterInfo | null) => void;
}

export function useChapterNavigation({ slug, chapterSlug, onChapterChange }: UseChapterNavigationProps) {
  const loadingRef = useRef<string | null>(null);
  const currentChapterSlugRef = useRef<string>(chapterSlug);

  const loadChapter = useCallback(async (targetSlug: string, preFetchedChapter?: ChapterInfo | null) => {
    const requestId = `${slug}-${targetSlug}`;
    loadingRef.current = requestId;

    try {
      // Use pre-fetched chapter if provided, otherwise fetch
      const ch = preFetchedChapter !== undefined ? preFetchedChapter : await getChapter(slug, targetSlug);

      if (loadingRef.current !== requestId) {
        return;
      }

      if (ch) {
        onChapterChange?.(ch);
        currentChapterSlugRef.current = targetSlug;
        await saveCurrentChapter(slug, targetSlug, ch.chapter.name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        onChapterChange?.(null);
      }
    } catch {
      if (loadingRef.current === requestId) {
        onChapterChange?.(null);
      }
    }
  }, [slug, onChapterChange]);

  // Navigate to next/prev chapter with index-based fallback
  const navigateChapter = useCallback(async (direction: 'next' | 'prev', currentChapter: ChapterInfo) => {
    // Helper to build chapter URL
    const buildChapterUrl = (chapterSlug: string): string => `/novel/${slug}/chapter/${chapterSlug}`;

    const targetSlug = direction === 'next'
      ? currentChapter.nextChapter?.slug
      : currentChapter.prevChapter?.slug;

    if (!targetSlug) {
      return;
    }

    // Try loading by slug first
    const targetChapter = await getChapter(slug, targetSlug);

    if (targetChapter) {
      await loadChapter(targetSlug, targetChapter);
      const newUrl = buildChapterUrl(targetSlug);
      window.history.pushState({ chapterSlug: targetSlug }, '', newUrl);
      return;
    }

    // Fallback: use chapter number-based navigation
    const allChapters = await listChapters(slug);

    // Extract chapter number from current slug (e.g., "chuong-15-..." -> 15)
    const currentSlug = currentChapter.chapter.slug ?? '';
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
        ? currentChapter.nextChapter
        : currentChapter.prevChapter;
      await loadChapter(fallbackSlug, fallbackChapter);
      const fallbackUrl = buildChapterUrl(fallbackSlug);
      window.history.pushState({ chapterSlug: fallbackSlug }, '', fallbackUrl);
    }
  }, [slug, loadChapter]);

  // Load chapter on slug change
  useEffect(() => {
    currentChapterSlugRef.current = chapterSlug;
    loadChapter(chapterSlug);
  }, [slug, chapterSlug, loadChapter]);

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

  return { loadChapter, navigateChapter };
}
