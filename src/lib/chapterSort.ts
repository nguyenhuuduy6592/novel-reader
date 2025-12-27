/**
 * Chapter sorting utility using topological sort with fallback strategies
 */

import { ChapterInfo, ChapterContent } from '@/types';
import { normalizeSlugCached, createSlugCache } from './slugify';

/**
 * Regex patterns for extracting chapter numbers from names
 */
const CHAPTER_NUMBER_PATTERNS = [
  /Chương\s*(\d+)/i,  // Vietnamese: "Chương 1", "Chương 2", etc.
  /Chuong\s*(\d+)/i,  // Unaccented: "Chuong 1", "Chuong 2", etc.
  /Chapter\s*(\d+)/i, // English: "Chapter 1", "Chapter 2", etc.
];

// Module-level cache for normalized slug map (reset between sort operations)
let normalizedMapCache: Map<string, ChapterInfo> | undefined = undefined;

/**
 * Type guard for chapters with valid slugs
 */
function isValidChapter(c: ChapterInfo): c is ChapterInfo & { chapter: ChapterContent & { slug: string } } {
  return !!c.chapter.slug;
}

/**
 * Finds a chapter by slug using three-strategy fallback
 *
 * Strategy 1: Exact slug match (O(1))
 * Strategy 2: Normalized slug match (O(n) - lazy, only when needed)
 * Strategy 3: Chapter number extraction (O(n) - ultimate fallback)
 *
 * @param targetSlug - The slug to find
 * @param chapters - Array of all chapters
 * @param slugCache - Cache for normalized slugs
 * @returns The found chapter or undefined
 */
function findChapterBySlug(
  targetSlug: string | undefined,
  chapters: ChapterInfo[],
  slugCache: Map<string, string>
): ChapterInfo | undefined {
  if (!targetSlug) return undefined;

  // Strategy 1: Exact slug match (fastest)
  const exactMatch = chapters.find(c => c.chapter.slug === targetSlug);
  if (exactMatch) return exactMatch;

  // Strategy 2: Normalized slug match (handles accent/special char differences)
  const normalizedTarget = normalizeSlugCached(targetSlug, slugCache);

  // Build normalized slug map lazily (only once per sort operation)
  if (!slugCache.has('__normalizedMap__built__')) {
    const newMap = new Map<string, ChapterInfo>();
    chapters.forEach(chapter => {
      if (chapter.chapter.slug) {
        const normalized = normalizeSlugCached(chapter.chapter.slug, slugCache);
        newMap.set(normalized, chapter);
      }
    });
    normalizedMapCache = newMap;
    slugCache.set('__normalizedMap__built__', 'true');
  }

  if (normalizedMapCache) {
    const normalizedMatch = normalizedMapCache.get(normalizedTarget);
    if (normalizedMatch) return normalizedMatch;
  }

  // Strategy 3: Chapter number extraction (ultimate fallback)
  for (const pattern of CHAPTER_NUMBER_PATTERNS) {
    const match = targetSlug.match(pattern);
    if (match && match[1]) {
      const targetNumber = parseInt(match[1], 10);

      // Find chapter with matching number in its name
      for (const chapter of chapters) {
        const chapterMatch = chapter.chapter.name.match(pattern);
        if (chapterMatch && chapterMatch[1]) {
          const chapterNumber = parseInt(chapterMatch[1], 10);
          if (chapterNumber === targetNumber) {
            return chapter;
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Sorts chapters using topological sort based on nextChapter/prevChapter links
 * Uses three-strategy fallback for finding chapters when slugs don't match
 *
 * Time complexity: O(n) average case, O(n²) worst case with fallbacks
 * Space complexity: O(n) for the chapter map and slug cache
 *
 * @param chapters - Array of chapters to sort
 * @returns Sorted array of chapters
 */
export function sortChapters(chapters: ChapterInfo[]): ChapterInfo[] {
  // Reset module-level cache at the start of each sort
  normalizedMapCache = undefined;

  if (!chapters || chapters.length === 0) return [];
  if (chapters.length === 1) return chapters;

  // Filter out chapters without slugs (invalid for sorting)
  const validChapters = chapters.filter(isValidChapter);
  if (validChapters.length === 0) return chapters;

  const slugCache = createSlugCache();
  const visited = new Set<string>();
  const sorted: ChapterInfo[] = [];

  // Build a map for O(1) lookups by exact slug
  const chapterMap = new Map<string, ChapterInfo>();
  validChapters.forEach(chapter => {
    chapterMap.set(chapter.chapter.slug, chapter);
  });

  // Track all chapter slugs for detecting orphans
  const allSlugs = new Set(validChapters.map(c => c.chapter.slug));

  // Find the head chapter (no prevChapter or prevChapter not in list)
  let head: ChapterInfo | undefined;

  // First try: find chapter with no prevChapter
  const noPrevChapters = validChapters.filter(c => !c.prevChapter);
  if (noPrevChapters.length > 0) {
    head = noPrevChapters[0];
  }

  // Second try: find chapter whose prevChapter doesn't exist in the list
  if (!head) {
    for (const chapter of validChapters) {
      if (chapter.prevChapter?.slug) {
        const prevChapter = findChapterBySlug(chapter.prevChapter.slug, validChapters, slugCache);
        if (!prevChapter) {
          // prevChapter slug doesn't match any chapter, so this might be the head
          head = chapter;
          break;
        }
      }
    }
  }

  // Third try: use the first chapter that doesn't have another chapter pointing to it
  if (!head) {
    const allNextSlugs = new Set(
      validChapters
        .map(c => c.nextChapter?.slug)
        .filter((slug): slug is string => !!slug)
    );
    head = validChapters.find(c => !allNextSlugs.has(c.chapter.slug));
  }

  // Final fallback: use the first chapter in the array
  if (!head) {
    head = validChapters[0];
  }

  // Traverse via nextChapter links using multi-strategy lookup
  let current: ChapterInfo | undefined = head;

  while (current) {
    // Detect cycles (defensive programming)
    const currentSlug = current.chapter.slug!;
    if (visited.has(currentSlug)) {
      break;
    }

    visited.add(currentSlug);
    sorted.push(current);
    allSlugs.delete(currentSlug);

    // Find next chapter using three-strategy fallback
    const nextSlug = current.nextChapter?.slug;
    current = findChapterBySlug(nextSlug, validChapters, slugCache);
  }

  // Append any orphan chapters that weren't reached via traversal
  // (e.g., chapters with broken links)
  for (const orphanSlug of allSlugs) {
    const orphan = chapterMap.get(orphanSlug);
    if (orphan) {
      sorted.push(orphan);
    }
  }

  return sorted;
}
