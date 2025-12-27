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
  markNovelCompleted,
  unmarkNovelCompleted,
  deleteCurrentChapter,
  updateNovelLastRead,
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
    it('returns current chapter info with name', async () => {
      await saveCurrentChapter('test-novel', 'chap-1', 'Chapter 1');
      const current = await getCurrentChapter('test-novel');
      expect(current).toEqual({ novelSlug: 'test-novel', chapterSlug: 'chap-1', chapterName: 'Chapter 1' });
    });

    it('returns null when no current chapter is set', async () => {
      const current = await getCurrentChapter('test-novel');
      expect(current).toBeNull();
    });

    it('updates current chapter when saving again', async () => {
      await saveCurrentChapter('test-novel', 'chap-1', 'Chapter 1');
      await saveCurrentChapter('test-novel', 'chap-2', 'Chapter 2');

      const current = await getCurrentChapter('test-novel');
      expect(current).toEqual({ novelSlug: 'test-novel', chapterSlug: 'chap-2', chapterName: 'Chapter 2' });
    });

    it('returns slug as name when name not stored', async () => {
      await saveCurrentChapter('test-novel', 'chap-1');
      const current = await getCurrentChapter('test-novel');
      expect(current).toEqual({ novelSlug: 'test-novel', chapterSlug: 'chap-1', chapterName: undefined });
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

  describe('markNovelCompleted', () => {
    it('marks a novel as completed with timestamp', async () => {
      await saveNovel(mockNovel);

      await markNovelCompleted('test-novel');

      const novel = await getNovel('test-novel');
      expect(novel?.completedAt).toBeDefined();
      expect(novel?.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('does not throw when marking non-existent novel', async () => {
      await expect(markNovelCompleted('non-existent')).resolves.not.toThrow();
    });
  });

  describe('unmarkNovelCompleted', () => {
    it('removes completedAt timestamp from novel', async () => {
      await saveNovel(mockNovel);
      await markNovelCompleted('test-novel');

      await unmarkNovelCompleted('test-novel');

      const novel = await getNovel('test-novel');
      expect(novel?.completedAt).toBeUndefined();
    });

    it('does not throw when unmarking non-existent novel', async () => {
      await expect(unmarkNovelCompleted('non-existent')).resolves.not.toThrow();
    });

    it('does not throw when unmarking novel that is not completed', async () => {
      await saveNovel(mockNovel);
      await expect(unmarkNovelCompleted('test-novel')).resolves.not.toThrow();
    });
  });

  describe('deleteCurrentChapter', () => {
    it('removes current chapter for novel', async () => {
      await saveNovel(mockNovel);
      await saveCurrentChapter('test-novel', 'chap-1', 'Chapter 1');

      await deleteCurrentChapter('test-novel');

      const currentChapter = await getCurrentChapter('test-novel');
      expect(currentChapter).toBeNull();
    });

    it('does not throw when no current chapter exists', async () => {
      await saveNovel(mockNovel);
      await expect(deleteCurrentChapter('test-novel')).resolves.not.toThrow();
    });

    it('does not throw when novel does not exist', async () => {
      await expect(deleteCurrentChapter('non-existent')).resolves.not.toThrow();
    });
  });

  describe('saveNovel preserves completion status', () => {
    it('preserves completedAt when re-saving novel', async () => {
      await saveNovel(mockNovel);
      await markNovelCompleted('test-novel');

      const updatedNovel: Novel = {
        ...mockNovel,
        book: { ...mockNovel.book, name: 'Updated Novel' },
      };
      await saveNovel(updatedNovel);

      const novel = await getNovel('test-novel');
      expect(novel?.book.name).toBe('Updated Novel');
      expect(novel?.completedAt).toBeDefined();
    });

    it('preserves lastReadAt when re-saving novel', async () => {
      await saveNovel(mockNovel);
      await updateNovelLastRead('test-novel');

      const updatedNovel: Novel = {
        ...mockNovel,
        book: { ...mockNovel.book, name: 'Updated Novel' },
      };
      await saveNovel(updatedNovel);

      const novel = await getNovel('test-novel');
      expect(novel?.book.name).toBe('Updated Novel');
      expect(novel?.lastReadAt).toBeDefined();
    });

    it('preserves both completedAt and lastReadAt when re-saving', async () => {
      await saveNovel(mockNovel);
      await updateNovelLastRead('test-novel');
      await markNovelCompleted('test-novel');

      const updatedNovel: Novel = {
        ...mockNovel,
        book: { ...mockNovel.book, name: 'Updated Novel' },
      };
      await saveNovel(updatedNovel);

      const novel = await getNovel('test-novel');
      expect(novel?.book.name).toBe('Updated Novel');
      expect(novel?.lastReadAt).toBeDefined();
      expect(novel?.completedAt).toBeDefined();
    });
  });

  describe('Completion persistence', () => {
    it('completion status persists across page refresh (simulated by new getNovel call)', async () => {
      await saveNovel(mockNovel);
      await markNovelCompleted('test-novel');

      // First retrieval - right after marking
      const novel1 = await getNovel('test-novel');
      expect(novel1?.completedAt).toBeDefined();

      // Second retrieval - simulates page refresh or component re-mount
      const novel2 = await getNovel('test-novel');
      expect(novel2?.completedAt).toBeDefined();
      expect(novel2?.completedAt).toBe(novel1?.completedAt);
    });

    it('completion status survives novel re-import (saveNovel with new data)', async () => {
      // Import novel initially
      await saveNovel(mockNovel);
      await markNovelCompleted('test-novel');

      const originalCompletedAt = (await getNovel('test-novel'))?.completedAt;

      // Re-import novel with updated metadata (simulating re-fetch from source)
      const reImportedNovel: Novel = {
        ...mockNovel,
        book: {
          ...mockNovel.book,
          name: 'Updated Novel Name',
          chapterCount: 5, // Updated chapter count
        },
        chapters: [
          // Different chapter data
          {
            chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Updated content' },
            nextChapter: undefined,
            prevChapter: undefined,
          },
        ],
      };
      await saveNovel(reImportedNovel);

      // Verify completion status is preserved
      const retrievedNovel = await getNovel('test-novel');
      expect(retrievedNovel?.book.name).toBe('Updated Novel Name');
      expect(retrievedNovel?.book.chapterCount).toBe(5);
      expect(retrievedNovel?.completedAt).toBe(originalCompletedAt);
    });

    it('exported novel includes completion status', async () => {
      await saveNovel(mockNovel);
      await markNovelCompleted('test-novel');

      const exported = await exportNovel('test-novel');

      expect(exported?.completedAt).toBeDefined();
      expect(exported?.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('getAllNovels returns completed novels with completedAt field', async () => {
      await saveNovel(mockNovel);
      await markNovelCompleted('test-novel');

      const novels = await getAllNovels();

      expect(novels).toHaveLength(1);
      expect(novels[0].completedAt).toBeDefined();
    });
  });

  describe('updateNovelLastRead', () => {
    it('updates the lastReadAt timestamp for a novel', async () => {
      await saveNovel(mockNovel);

      const beforeNovel = await getNovel('test-novel');
      expect(beforeNovel?.lastReadAt).toBeUndefined();

      await updateNovelLastRead('test-novel');

      const afterNovel = await getNovel('test-novel');
      expect(afterNovel?.lastReadAt).toBeDefined();
      expect(new Date(afterNovel!.lastReadAt!).toISOString()).toBe(afterNovel!.lastReadAt);
    });

    it('does not throw when updating non-existent novel', async () => {
      await expect(updateNovelLastRead('non-existent')).resolves.not.toThrow();
    });

    it('preserves other novel properties when updating lastReadAt', async () => {
      await saveNovel(mockNovel);

      await updateNovelLastRead('test-novel');

      const novel = await getNovel('test-novel');
      expect(novel?.book.slug).toBe('test-novel');
      expect(novel?.book.name).toBe('Test Novel');
      expect(novel?.lastReadAt).toBeDefined();
    });
  });
});
