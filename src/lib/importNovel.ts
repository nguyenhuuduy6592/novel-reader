import { GenericResponse, Novel } from '@/types';
import { saveNovel } from './localStorage';

export async function importNovelFromJson(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonString) as GenericResponse<Novel>;
    const novel = data.pageProps;

    // Process coverUrl like the API does
    novel.book.coverUrl = novel.book.coverUrl.startsWith('http')
      ? novel.book.coverUrl
      : `https://static.truyenchucv.org${novel.book.coverUrl}`;

    console.log('Importing novel:', novel);
    saveNovel(novel);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON or novel data',
    };
  }
}