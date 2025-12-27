import { Novel, ChapterInfo } from '@/types';

const DB_NAME = 'novel-reader';
const DB_VERSION = 2;

interface StoredChapter {
  id: string;
  novelSlug: string;
  sortOrder: number;
  chapter: ChapterInfo;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Novels store
      if (!db.objectStoreNames.contains('novels')) {
        db.createObjectStore('novels', { keyPath: 'book.slug' });
      }

      // Chapters store
      if (!db.objectStoreNames.contains('chapters')) {
        const chaptersStore = db.createObjectStore('chapters', { keyPath: 'id' });
        chaptersStore.createIndex('novelSlug', 'novelSlug', { unique: false });
      }

      // Current chapter store
      if (!db.objectStoreNames.contains('currentChapters')) {
        db.createObjectStore('currentChapters', { keyPath: 'novelSlug' });
      }
    };
  });
}

// Helper: promisify an IndexedDB request
function promisifyRequest<T>(request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Helper: execute a callback with auto-close and SSR guard
async function withDB<T>(
  stores: string[],
  mode: IDBTransactionMode,
  callback: (tx: IDBTransaction) => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined') {
    return undefined as T;
  }

  const db = await openDB();
  try {
    const tx = db.transaction(stores, mode);
    return await callback(tx);
  } finally {
    db.close();
  }
}

export async function saveNovel(novel: Novel): Promise<void> {
  await withDB(['novels', 'chapters'], 'readwrite', async (tx) => {
    // Save novel (without chapters to save space)
    const novelsStore = tx.objectStore('novels');
    const novelToSave = { ...novel };
    delete novelToSave.chapters;

    // Preserve lastReadAt and completedAt if the novel already exists
    const existingNovel = await promisifyRequest<Novel | undefined>(
      novelsStore.get(novel.book.slug)
    );
    if (existingNovel?.lastReadAt) {
      novelToSave.lastReadAt = existingNovel.lastReadAt;
    }
  if (existingNovel?.completedAt) {
    novelToSave.completedAt = existingNovel.completedAt;
  }

    await promisifyRequest(novelsStore.put(novelToSave));

    // Save chapters if present
    if (novel.chapters) {
      const chaptersStore = tx.objectStore('chapters');
      for (let i = 0; i < novel.chapters.length; i++) {
        const chapterInfo = novel.chapters[i];
        const chapterId = `${novel.book.slug}-${chapterInfo.chapter.slug}`;

        // Check if chapter already exists and has an AI summary
        const existingChapter = await promisifyRequest<StoredChapter | undefined>(
          chaptersStore.get(chapterId)
        );

        // Preserve AI summary if it exists
        const chapterToSave = existingChapter?.chapter.chapter.aiSummary
          ? {
              ...chapterInfo,
              chapter: {
                ...chapterInfo.chapter,
                aiSummary: existingChapter.chapter.chapter.aiSummary,
              },
            }
          : chapterInfo;

        const storedChapter: StoredChapter = {
          id: chapterId,
          novelSlug: novel.book.slug,
          sortOrder: i,
          chapter: chapterToSave,
        };
        await promisifyRequest(chaptersStore.put(storedChapter));
      }
    }
  });
}

export async function getNovel(slug: string): Promise<Novel | null> {
  return withDB(['novels'], 'readonly', async (tx) => {
    const novelsStore = tx.objectStore('novels');
    const result = await promisifyRequest<Novel | undefined>(novelsStore.get(slug));
    return result || null;
  });
}

export async function getAllNovels(): Promise<Novel[]> {
  return withDB(['novels'], 'readonly', async (tx) => {
    const novelsStore = tx.objectStore('novels');
    return promisifyRequest(novelsStore.getAll());
  });
}

export async function removeNovel(slug: string): Promise<void> {
  await withDB(['novels', 'chapters', 'currentChapters'], 'readwrite', async (tx) => {
    // Remove novel
    const novelsStore = tx.objectStore('novels');
    await promisifyRequest(novelsStore.delete(slug));

    // Remove chapters
    const chaptersStore = tx.objectStore('chapters');
    const index = chaptersStore.index('novelSlug');
    const chapters = await promisifyRequest<StoredChapter[]>(index.getAll(slug));
    for (const chapter of chapters) {
      await promisifyRequest(chaptersStore.delete(chapter.id));
    }

    // Remove current chapter
    const currentChaptersStore = tx.objectStore('currentChapters');
    await promisifyRequest(currentChaptersStore.delete(slug));
  });
}

export async function listChapters(novelSlug: string): Promise<ChapterInfo[]> {
  return withDB(['chapters'], 'readonly', async (tx) => {
    const chaptersStore = tx.objectStore('chapters');
    const index = chaptersStore.index('novelSlug');
    const storedChapters = await promisifyRequest<StoredChapter[]>(index.getAll(novelSlug));
    // Sort by sortOrder (handle old records without sortOrder by placing them at the end)
    const sorted = storedChapters.sort((a, b) => {
      const aOrder = a.sortOrder ?? Infinity;
      const bOrder = b.sortOrder ?? Infinity;
      return aOrder - bOrder;
    });
    return sorted.map(sc => sc.chapter);
  });
}

export interface CurrentChapter {
  novelSlug: string;
  chapterSlug: string;
  chapterName?: string;
}

export async function saveCurrentChapter(
  novelSlug: string,
  chapterSlug: string,
  chapterName?: string
): Promise<void> {
  await withDB(['currentChapters'], 'readwrite', async (tx) => {
    const store = tx.objectStore('currentChapters');
    const currentChapter: CurrentChapter = { novelSlug, chapterSlug, chapterName };
    await promisifyRequest(store.put(currentChapter));
  });
}

export async function getCurrentChapter(novelSlug: string): Promise<CurrentChapter | null> {
  return withDB(['currentChapters'], 'readonly', async (tx) => {
    const store = tx.objectStore('currentChapters');
    const result = await promisifyRequest<CurrentChapter | undefined>(store.get(novelSlug));
    return result || null;
  });
}

export async function deleteCurrentChapter(novelSlug: string): Promise<void> {
  await withDB(['currentChapters'], 'readwrite', async (tx) => {
    const store = tx.objectStore('currentChapters');
    await promisifyRequest(store.delete(novelSlug));
  });
}

export async function getChapter(novelSlug: string, chapterSlug: string): Promise<ChapterInfo | null> {
  const id = `${novelSlug}-${chapterSlug}`;
  return withDB(['chapters'], 'readonly', async (tx) => {
    const chaptersStore = tx.objectStore('chapters');
    const stored = await promisifyRequest<StoredChapter | undefined>(chaptersStore.get(id));
    return stored ? stored.chapter : null;
  });
}

export async function saveChapterSummary(
  novelSlug: string,
  chapterSlug: string,
  summary: string
): Promise<void> {
  const id = `${novelSlug}-${chapterSlug}`;

  await withDB(['chapters'], 'readwrite', async (tx) => {
    const chaptersStore = tx.objectStore('chapters');

    // First get the existing chapter
    const existingChapter = await promisifyRequest<StoredChapter | undefined>(
      chaptersStore.get(id)
    );

    if (!existingChapter) {
      throw new Error('Chapter not found');
    }

    // Update the chapter with the summary
    existingChapter.chapter.chapter.aiSummary = summary;

    // Save back to chapters store
    await promisifyRequest(chaptersStore.put(existingChapter));
  });
}

export async function updateNovelLastRead(novelSlug: string): Promise<void> {
  await withDB(['novels'], 'readwrite', async (tx) => {
    const novelsStore = tx.objectStore('novels');
    const novel = await promisifyRequest<Novel | undefined>(novelsStore.get(novelSlug));

    if (novel) {
      novel.lastReadAt = new Date().toISOString();
      await promisifyRequest(novelsStore.put(novel));
    }
  });
}

export async function exportNovel(slug: string): Promise<Novel | null> {
  if (typeof window === 'undefined') return null;

  const db = await openDB();

  // Get novel metadata
  const novel = await promisifyRequest<Novel | null>(
    (() => {
      const tx = db.transaction(['novels'], 'readonly');
      const novelsStore = tx.objectStore('novels');
      return novelsStore.get(slug);
    })()
  );

  if (!novel) {
    db.close();
    return null;
  }

  // Get all chapters for this novel
  const chapters = await listChapters(slug);

  db.close();

  // Combine novel metadata with chapters (same structure as import)
  return {
    ...novel,
    chapters,
  };
}

export async function markNovelCompleted(novelSlug: string): Promise<void> {
  await withDB(['novels'], 'readwrite', async (tx) => {
    const novelsStore = tx.objectStore('novels');
    const novel = await promisifyRequest<Novel | undefined>(novelsStore.get(novelSlug));

    if (novel) {
      novel.completedAt = new Date().toISOString();
      await promisifyRequest(novelsStore.put(novel));
    }
  });
}

export async function unmarkNovelCompleted(novelSlug: string): Promise<void> {
  await withDB(['novels'], 'readwrite', async (tx) => {
    const novelsStore = tx.objectStore('novels');
    const novel = await promisifyRequest<Novel | undefined>(novelsStore.get(novelSlug));

    if (novel) {
      delete novel.completedAt;
      await promisifyRequest(novelsStore.put(novel));
    }
  });
}
