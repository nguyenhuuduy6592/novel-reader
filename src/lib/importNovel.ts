import { Novel, ApiResponse } from '@/types';
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