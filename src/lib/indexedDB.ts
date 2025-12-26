import { Novel, ChapterInfo } from '@/types';

const DB_NAME = 'novel-reader';
const DB_VERSION = 2;

interface StoredChapter {
  id: string;
  novelSlug: string;
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

export async function saveNovel(novel: Novel): Promise<void> {
  if (typeof window === 'undefined') return;

  const db = await openDB();
  const tx = db.transaction(['novels', 'chapters'], 'readwrite');

  // Save novel
  const novelsStore = tx.objectStore('novels');
  await new Promise<void>((resolve, reject) => {
    const request = novelsStore.put(novel);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Save chapters if present
  if (novel.chapters) {
    const chaptersStore = tx.objectStore('chapters');
    for (const chapterInfo of novel.chapters) {
      const chapterId = `${novel.book.slug}-${chapterInfo.chapter.slug}`;

      // Check if chapter already exists and has an AI summary
      const existingChapter = await new Promise<StoredChapter | undefined>((resolve, reject) => {
        const request = chaptersStore.get(chapterId);
        request.onsuccess = () => resolve(request.result as StoredChapter | undefined);
        request.onerror = () => reject(request.error);
      });

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
        chapter: chapterToSave,
      };
      await new Promise<void>((resolve, reject) => {
        const request = chaptersStore.put(storedChapter);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  db.close();
}

export async function getNovel(slug: string): Promise<Novel | null> {
  if (typeof window === 'undefined') return null;

  const db = await openDB();
  const tx = db.transaction(['novels'], 'readonly');
  const novelsStore = tx.objectStore('novels');

  return new Promise<Novel | null>((resolve, reject) => {
    const request = novelsStore.get(slug);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function getAllNovels(): Promise<Novel[]> {
  if (typeof window === 'undefined') return [];

  const db = await openDB();
  const tx = db.transaction(['novels'], 'readonly');
  const novelsStore = tx.objectStore('novels');

  return new Promise<Novel[]>((resolve, reject) => {
    const request = novelsStore.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function removeNovel(slug: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const db = await openDB();
  const tx = db.transaction(['novels', 'chapters', 'currentChapters'], 'readwrite');

  // Remove novel
  const novelsStore = tx.objectStore('novels');
  await new Promise<void>((resolve, reject) => {
    const request = novelsStore.delete(slug);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Remove chapters
  const chaptersStore = tx.objectStore('chapters');
  const index = chaptersStore.index('novelSlug');
  const chapters = await new Promise<StoredChapter[]>((resolve, reject) => {
    const request = index.getAll(slug);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  for (const chapter of chapters) {
    await new Promise<void>((resolve, reject) => {
      const request = chaptersStore.delete(chapter.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Remove current chapter
  const currentChaptersStore = tx.objectStore('currentChapters');
  await new Promise<void>((resolve, reject) => {
    const request = currentChaptersStore.delete(slug);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

export async function listChapters(novelSlug: string): Promise<ChapterInfo[]> {
  if (typeof window === 'undefined') return [];

  const db = await openDB();
  const tx = db.transaction(['chapters'], 'readonly');
  const chaptersStore = tx.objectStore('chapters');
  const index = chaptersStore.index('novelSlug');

  return new Promise<ChapterInfo[]>((resolve, reject) => {
    const request = index.getAll(novelSlug);
    request.onsuccess = () => {
      const storedChapters = request.result as StoredChapter[];
      resolve(storedChapters.map(sc => sc.chapter));
    };
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

interface CurrentChapter {
  novelSlug: string;
  chapterSlug: string;
}

export async function saveCurrentChapter(novelSlug: string, chapterSlug: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const db = await openDB();
  const tx = db.transaction(['currentChapters'], 'readwrite');
  const store = tx.objectStore('currentChapters');
  
  const currentChapter: CurrentChapter = { novelSlug, chapterSlug };
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(currentChapter);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
}

export async function getCurrentChapter(novelSlug: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const db = await openDB();
  const tx = db.transaction(['currentChapters'], 'readonly');
  const store = tx.objectStore('currentChapters');
  
  return new Promise<string | null>((resolve, reject) => {
    const request = store.get(novelSlug);
    request.onsuccess = () => {
      const result = request.result as CurrentChapter | undefined;
      resolve(result ? result.chapterSlug : null);
    };
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function getChapter(novelSlug: string, chapterSlug: string): Promise<ChapterInfo | null> {
  if (typeof window === 'undefined') return null;

  const db = await openDB();
  const tx = db.transaction(['chapters'], 'readonly');
  const chaptersStore = tx.objectStore('chapters');

  const id = `${novelSlug}-${chapterSlug}`;
  return new Promise<ChapterInfo | null>((resolve, reject) => {
    const request = chaptersStore.get(id);
    request.onsuccess = () => {
      const stored = request.result as StoredChapter | undefined;
      resolve(stored ? stored.chapter : null);
    };
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function saveChapterSummary(novelSlug: string, chapterSlug: string, summary: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const db = await openDB();
  const tx = db.transaction(['chapters'], 'readwrite');
  const chaptersStore = tx.objectStore('chapters');

  const id = `${novelSlug}-${chapterSlug}`;

  // First get the existing chapter
  const existingChapter = await new Promise<StoredChapter | undefined>((resolve, reject) => {
    const request = chaptersStore.get(id);
    request.onsuccess = () => resolve(request.result as StoredChapter | undefined);
    request.onerror = () => reject(request.error);
  });

  if (!existingChapter) {
    db.close();
    throw new Error('Chapter not found');
  }

  // Update the chapter with the summary
  existingChapter.chapter.chapter.aiSummary = summary;

  // Save back to DB
  await new Promise<void>((resolve, reject) => {
    const request = chaptersStore.put(existingChapter);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}