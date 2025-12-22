import { Novel } from '@/types';
import { saveNovel } from './indexedDB';

export async function importNovelFromJson(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const novel = JSON.parse(jsonString) as Novel;

    // Process coverUrl like the API does
    novel.book.coverUrl = novel.book.coverUrl.startsWith('http')
      ? novel.book.coverUrl
      : `https://static.truyenchucv.org${novel.book.coverUrl}`;

    novel.chapters = novel.chapters?.sort((a, b) => (a.chapter.slug || '').localeCompare(b.chapter.slug || '')) || [];

    console.log('Importing novel:', novel);
    await saveNovel(novel);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON or novel data',
    };
  }
}