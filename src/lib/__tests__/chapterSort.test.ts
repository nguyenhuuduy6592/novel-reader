import { sortChapters } from '../chapterSort';
import { ChapterInfo } from '@/types';

describe('chapterSort', () => {
  const createChapter = (
    slug: string,
    name: string,
    nextSlug?: string,
    prevSlug?: string
  ): ChapterInfo => ({
    chapter: {
      slug,
      name,
      content: 'Test content',
    },
    nextChapter: nextSlug ? { slug: nextSlug, name: '', content: '' } : undefined,
    prevChapter: prevSlug ? { slug: prevSlug, name: '', content: '' } : undefined,
  });

  describe('basic sorting', () => {
    it('sorts chapters in correct order using nextChapter/prevChapter links', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-3', 'Chương 3', 'chuong-4', 'chuong-2'),
        createChapter('chuong-1', 'Chương 1', 'chuong-2', undefined),
        createChapter('chuong-2', 'Chương 2', 'chuong-3', 'chuong-1'),
        createChapter('chuong-4', 'Chương 4', undefined, 'chuong-3'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(4);
      expect(sorted[0].chapter.slug).toBe('chuong-1');
      expect(sorted[1].chapter.slug).toBe('chuong-2');
      expect(sorted[2].chapter.slug).toBe('chuong-3');
      expect(sorted[3].chapter.slug).toBe('chuong-4');
    });

    it('handles single chapter', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].chapter.slug).toBe('chuong-1');
    });

    it('handles empty array', () => {
      const sorted = sortChapters([]);
      expect(sorted).toHaveLength(0);
    });

    it('handles undefined input', () => {
      const sorted = sortChapters(undefined as unknown as ChapterInfo[]);
      expect(sorted).toHaveLength(0);
    });
  });

  describe('fallback strategies', () => {
    it('uses normalized slug matching when exact match fails', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1', 'Chuong 2', undefined),
        createChapter('Chuong 2', 'Chương 2', 'chuong-3', 'chuong-1'),
        createChapter('chuong-3', 'Chương 3', undefined, 'chuong-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].chapter.slug).toBe('chuong-1');
      expect(sorted[1].chapter.slug).toBe('Chuong 2');
      expect(sorted[2].chapter.slug).toBe('chuong-3');
    });

    it('uses chapter number extraction when slug matching fails', () => {
      const chapters: ChapterInfo[] = [
        createChapter('random-1', 'Chương 1', 'random-2', undefined),
        createChapter('random-2', 'Chương 2', 'random-3', 'random-1'),
        createChapter('random-3', 'Chương 3', undefined, 'random-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].chapter.slug).toBe('random-1');
      expect(sorted[1].chapter.slug).toBe('random-2');
      expect(sorted[2].chapter.slug).toBe('random-3');
    });

    it('handles Vietnamese accents in slugs', () => {
      const chapters: ChapterInfo[] = [
        createChapter(' chương-1 ', 'Chương 1', 'Chương-2', undefined),
        createChapter('Chương-2', 'Chương 2', 'chuong-3', 'chuong-1'),
        createChapter('chuong-3', 'Chương 3', undefined, 'chuong-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('handles missing prevChapter on head chapter', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1', 'chuong-2', undefined),
        createChapter('chuong-2', 'Chương 2', 'chuong-3', 'chuong-1'),
        createChapter('chuong-3', 'Chương 3', undefined, 'chuong-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted[0].chapter.slug).toBe('chuong-1');
    });

    it('handles missing nextChapter on tail chapter', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1', 'chuong-2', undefined),
        createChapter('chuong-2', 'Chương 2', 'chuong-3', 'chuong-1'),
        createChapter('chuong-3', 'Chương 3', undefined, 'chuong-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted[2].chapter.slug).toBe('chuong-3');
    });

    it('handles orphan chapters (broken links)', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1', 'chuong-2', undefined),
        createChapter('chuong-2', 'Chương 2', undefined, 'chuong-1'),
        createChapter('chuong-3', 'Chương 3'), // Orphan with no links
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].chapter.slug).toBe('chuong-1');
      expect(sorted[1].chapter.slug).toBe('chuong-2');
      // Orphan should be at the end
      expect(sorted[2].chapter.slug).toBe('chuong-3');
    });

    it('detects and breaks circular references', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1', 'chuong-2', undefined),
        createChapter('chuong-2', 'Chương 2', 'chuong-3', 'chuong-1'),
        createChapter('chuong-3', 'Chương 3', 'chuong-1', 'chuong-2'), // Cycle back to 1
      ];

      const sorted = sortChapters(chapters);

      // Should stop at cycle and not infinite loop
      expect(sorted.length).toBeGreaterThan(0);
      expect(sorted.length).toBeLessThanOrEqual(3);
    });

    it('handles chapters with no links (uses array order)', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1'),
        createChapter('chuong-2', 'Chương 2'),
        createChapter('chuong-3', 'Chương 3'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
      // All chapters should be present
      expect(sorted.every(c => c.chapter.slug)).toBeTruthy();
    });

    it('handles chapters with Vietnamese accents in names', () => {
      const chapters: ChapterInfo[] = [
        createChapter('slug-1', 'Chương 1: Bắt đầu', 'slug-2', undefined),
        createChapter('slug-2', 'Chương 2: Hành trình', 'slug-3', 'slug-1'),
        createChapter('slug-3', 'Chương 3: Kết thúc', undefined, 'slug-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].chapter.name).toBe('Chương 1: Bắt đầu');
      expect(sorted[1].chapter.name).toBe('Chương 2: Hành trình');
      expect(sorted[2].chapter.name).toBe('Chương 3: Kết thúc');
    });

    it('handles special characters in slugs', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong@1', 'Chương 1', 'chuong@2', undefined),
        createChapter('chuong@2', 'Chương 2', 'chuong@3', 'chuong@1'),
        createChapter('chuong@3', 'Chương 3', undefined, 'chuong@2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
    });

    it('handles English chapter names', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chapter-1', 'Chapter 1: The Beginning', 'chapter-2', undefined),
        createChapter('chapter-2', 'Chapter 2: The Journey', 'chapter-3', 'chapter-1'),
        createChapter('chapter-3', 'Chapter 3: The End', undefined, 'chapter-2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].chapter.slug).toBe('chapter-1');
      expect(sorted[1].chapter.slug).toBe('chapter-2');
      expect(sorted[2].chapter.slug).toBe('chapter-3');
    });

    it('handles missing slug references gracefully', () => {
      const chapters: ChapterInfo[] = [
        createChapter('chuong-1', 'Chương 1', 'non-existent', undefined),
        createChapter('chuong-2', 'Chương 2', undefined, 'chuong-1'),
      ];

      const sorted = sortChapters(chapters);

      // Should sort what it can
      expect(sorted.length).toBeGreaterThan(0);
    });

    it('handles mixed Vietnamese and English chapter patterns', () => {
      const chapters: ChapterInfo[] = [
        createChapter('c1', 'Chương 1', 'c2', undefined),
        createChapter('c2', 'Chapter 2', 'c3', 'c1'),
        createChapter('c3', 'Chuong 3', undefined, 'c2'),
      ];

      const sorted = sortChapters(chapters);

      expect(sorted).toHaveLength(3);
    });
  });
});
