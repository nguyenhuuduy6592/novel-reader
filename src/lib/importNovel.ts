import { Novel, ApiResponse, NovelResponse } from '@/types';
import { saveNovel } from './localStorage';

export async function importNovel(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/novel/${url}`);
    const data: ApiResponse<Novel> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch novel');
    }

    saveNovel(data.data);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function importNovelFromJson(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonString);
    let novel: Novel;

    if (data.pageProps) {
      // It's a NovelResponse
      novel = data.pageProps;
    } else {
      // Assume it's directly the Novel
      novel = data;
    }

    // Process coverUrl like the API does
    novel.book.coverUrl = novel.book.coverUrl.startsWith('http')
      ? novel.book.coverUrl
      : `https://static.truyenchucv.org${novel.book.coverUrl}`;

    saveNovel(novel);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON or novel data',
    };
  }
}