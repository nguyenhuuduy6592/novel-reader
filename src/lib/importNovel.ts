import { Novel } from '@/types';
import { saveNovel } from './indexedDB';
import { sortChapters } from './chapterSort';
import { normalizeSlug } from './slugify';

export async function importNovelFromJson(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const novel = JSON.parse(jsonString) as Novel;

    // Process coverUrl like the API does
    novel.book.coverUrl = novel.book.coverUrl.startsWith('http')
      ? novel.book.coverUrl
      : `https://static.truyenchucv.org${novel.book.coverUrl}`;

    // Sort chapters using topological sort with fallback strategies
    if (novel.chapters && novel.chapters.length > 0) {
      novel.chapters = sortChapters(novel.chapters);

      // Normalize all chapter slugs and update references
      const slugMap = new Map<string, string>();

      // First pass: normalize all chapter slugs
      novel.chapters.forEach(chapterInfo => {
        const originalSlug = chapterInfo.chapter.slug;
        if (originalSlug) {
          const normalizedSlug = normalizeSlug(originalSlug);
          slugMap.set(originalSlug, normalizedSlug);
          chapterInfo.chapter.slug = normalizedSlug;
        }
      });

      // Second pass: update nextChapter and prevChapter slug references
      novel.chapters.forEach(chapterInfo => {
        if (chapterInfo.nextChapter?.slug) {
          const normalized = slugMap.get(chapterInfo.nextChapter.slug);
          if (normalized) {
            chapterInfo.nextChapter.slug = normalized;
          }
        }
        if (chapterInfo.prevChapter?.slug) {
          const normalized = slugMap.get(chapterInfo.prevChapter.slug);
          if (normalized) {
            chapterInfo.prevChapter.slug = normalized;
          }
        }
      });
    }

    await saveNovel(novel);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON or novel data',
    };
  }
}