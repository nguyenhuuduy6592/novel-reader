// Polyfill structuredClone for fake-indexeddb
if (!global.structuredClone) {
  global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

import 'fake-indexeddb/auto';
import {
  saveNovel,
  getNovel,
  getAllNovels,
  removeNovel,
  listChapters,
  saveCurrentChapter,
  getCurrentChapter,
  getChapter,
  saveChapterSummary,
  exportNovel,
} from '../indexedDB';
import { Novel } from '@/types';

const mockNovel: Novel = {
  book: {
    bookId: 1,
    slug: 'test-novel',
    coverUrl: '/cover.jpg',
    name: 'Test Novel',
    chapterCount: 2,
    author: { name: 'Test Author' },
  },
  chapters: [
    {
      chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' },
      nextChapter: { name: 'Chapter 2', slug: 'chap-2', content: '' },
      prevChapter: undefined,
    },
    {
      chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' },
      nextChapter: undefined,
      prevChapter: { name: 'Chapter 1', slug: 'chap-1', content: '' },
    },
  ],
};

describe('indexedDB', () => {
  beforeEach(() => {
    // Delete and recreate database for clean state
    indexedDB.deleteDatabase('novel-reader');
  });

  describe('saveNovel and getNovel', () => {
    it('saves and retrieves a novel', async () => {
      await saveNovel(mockNovel);

      const retrieved = await getNovel('test-novel');

      expect(retrieved).toBeDefined();
      expect(retrieved?.book.slug).toBe('test-novel');
      expect(retrieved?.book.name).toBe('Test Novel');
      expect(retrieved?.book.author.name).toBe('Test Author');
    });

    it('returns null for non-existent novel', async () => {
      const retrieved = await getNovel('non-existent');
      expect(retrieved).toBeNull();
    });

    it('preserves existing AI summary when re-saving novel', async () => {
      await saveNovel(mockNovel);

      // Add AI summary to chapter 1
      await saveChapterSummary('test-novel', 'chap-1', 'Existing summary');

      // Re-save the novel with different content
      const updatedNovel: Novel = {
        ...mockNovel,
        book: { ...mockNovel.book, name: 'Updated Novel' },
      };
      await saveNovel(updatedNovel);

      // Get chapter and verify AI summary is preserved
      const chapter = await getChapter('test-novel', 'chap-1');
      expect(chapter?.chapter.aiSummary).toBe('Existing summary');
    });
  });

  describe('getAllNovels', () => {
    it('returns empty array when no novels exist', async () => {
      const novels = await getAllNovels();
      expect(novels).toEqual([]);
    });

    it('returns all saved novels', async () => {
      await saveNovel(mockNovel);

      const secondNovel: Novel = {
        book: {
          bookId: 2,
          slug: 'second-novel',
          coverUrl: '/cover2.jpg',
          name: 'Second Novel',
          chapterCount: 1,
          author: { name: 'Another Author' },
        },
        chapters: [
          {
            chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content' },
            nextChapter: undefined,
            prevChapter: undefined,
          },
        ],
      };
      await saveNovel(secondNovel);

      const novels = await getAllNovels();
      expect(novels).toHaveLength(2);
      expect(novels.map(n => n.book.slug)).toContain('test-novel');
      expect(novels.map(n => n.book.slug)).toContain('second-novel');
    });
  });

  describe('removeNovel', () => {
    it('removes novel and its associated data', async () => {
      await saveNovel(mockNovel);
      await saveCurrentChapter('test-novel', 'chap-1');

      await removeNovel('test-novel');

      // Novel should be gone
      const novel = await getNovel('test-novel');
      expect(novel).toBeNull();

      // Chapters should be gone
      const chapters = await listChapters('test-novel');
      expect(chapters).toEqual([]);

      // Current chapter should be gone
      const currentChapter = await getCurrentChapter('test-novel');
      expect(currentChapter).toBeNull();
    });

    it('does not throw when removing non-existent novel', async () => {
      await expect(removeNovel('non-existent')).resolves.not.toThrow();
    });
  });

  describe('listChapters', () => {
    it('returns empty array for novel with no chapters', async () => {
      const novelWithoutChapters: Novel = {
        book: mockNovel.book,
      };
      await saveNovel(novelWithoutChapters);

      const chapters = await listChapters('test-novel');
      expect(chapters).toEqual([]);
    });

    it('returns all chapters for a novel', async () => {
      await saveNovel(mockNovel);

      const chapters = await listChapters('test-novel');
      expect(chapters).toHaveLength(2);
      expect(chapters[0].chapter.slug).toBe('chap-1');
      expect(chapters[1].chapter.slug).toBe('chap-2');
    });

    it('returns empty array for non-existent novel', async () => {
      const chapters = await listChapters('non-existent');
      expect(chapters).toEqual([]);
    });
  });

  describe('getChapter', () => {
    it('retrieves a specific chapter', async () => {
      await saveNovel(mockNovel);

      const chapter = await getChapter('test-novel', 'chap-1');

      expect(chapter).toBeDefined();
      expect(chapter?.chapter.slug).toBe('chap-1');
      expect(chapter?.chapter.name).toBe('Chapter 1');
      expect(chapter?.chapter.content).toBe('Content 1');
    });

    it('returns null for non-existent chapter', async () => {
      await saveNovel(mockNovel);

      const chapter = await getChapter('test-novel', 'non-existent');
      expect(chapter).toBeNull();
    });

    it('returns null for non-existent novel', async () => {
      const chapter = await getChapter('non-existent', 'chap-1');
      expect(chapter).toBeNull();
    });
  });

  describe('saveCurrentChapter and getCurrentChapter', () => {
    it('saves and retrieves current chapter', async () => {
      await saveCurrentChapter('test-novel', 'chap-1');

      const current = await getCurrentChapter('test-novel');
      expect(current).toBe('chap-1');
    });

    it('returns null when no current chapter is set', async () => {
      const current = await getCurrentChapter('test-novel');
      expect(current).toBeNull();
    });

    it('updates current chapter when saving again', async () => {
      await saveCurrentChapter('test-novel', 'chap-1');
      await saveCurrentChapter('test-novel', 'chap-2');

      const current = await getCurrentChapter('test-novel');
      expect(current).toBe('chap-2');
    });
  });

  describe('saveChapterSummary', () => {
    it('saves AI summary to existing chapter', async () => {
      await saveNovel(mockNovel);

      await saveChapterSummary('test-novel', 'chap-1', 'Test summary');

      const chapter = await getChapter('test-novel', 'chap-1');
      expect(chapter?.chapter.aiSummary).toBe('Test summary');
    });

    it('throws error when chapter does not exist', async () => {
      await expect(
        saveChapterSummary('test-novel', 'non-existent', 'summary')
      ).rejects.toThrow('Chapter not found');
    });

    it('overwrites existing summary', async () => {
      await saveNovel(mockNovel);
      await saveChapterSummary('test-novel', 'chap-1', 'Original summary');

      await saveChapterSummary('test-novel', 'chap-1', 'Updated summary');

      const chapter = await getChapter('test-novel', 'chap-1');
      expect(chapter?.chapter.aiSummary).toBe('Updated summary');
    });
  });

  describe('exportNovel', () => {
    it('exports novel with all chapters', async () => {
      await saveNovel(mockNovel);

      const exported = await exportNovel('test-novel');

      expect(exported).toBeDefined();
      expect(exported?.book.slug).toBe('test-novel');
      expect(exported?.book.name).toBe('Test Novel');
      expect(exported?.chapters).toHaveLength(2);
      expect(exported?.chapters?.[0]?.chapter.slug).toBe('chap-1');
      expect(exported?.chapters?.[1]?.chapter.slug).toBe('chap-2');
    });

    it('includes AI summaries in export', async () => {
      await saveNovel(mockNovel);
      await saveChapterSummary('test-novel', 'chap-1', 'AI-generated summary');

      const exported = await exportNovel('test-novel');

      expect(exported?.chapters?.[0]?.chapter.aiSummary).toBe('AI-generated summary');
    });

    it('returns null for non-existent novel', async () => {
      const exported = await exportNovel('non-existent');
      expect(exported).toBeNull();
    });

    it('exports novel in same structure as import', async () => {
      await saveNovel(mockNovel);

      const exported = await exportNovel('test-novel');

      // Verify structure matches Novel type with chapters
      expect(exported).toMatchObject({
        book: {
          bookId: expect.any(Number),
          slug: expect.any(String),
          coverUrl: expect.any(String),
          name: expect.any(String),
          chapterCount: expect.any(Number),
          author: { name: expect.any(String) },
        },
        chapters: expect.any(Array),
      });
    });

    it('exports novel without chapters when none exist', async () => {
      const novelWithoutChapters: Novel = {
        book: mockNovel.book,
      };
      await saveNovel(novelWithoutChapters);

      const exported = await exportNovel('test-novel');

      expect(exported?.book.slug).toBe('test-novel');
      expect(exported?.chapters).toEqual([]);
    });
  });
});
