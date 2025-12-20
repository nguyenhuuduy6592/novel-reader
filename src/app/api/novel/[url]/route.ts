import { NextRequest, NextResponse } from 'next/server';
import { Novel, ApiResponse, ChaptersResponse, NovelResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params;
    // Fetch first page to get totalPages
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch novel: ${response.statusText}`);
    }

    const data: NovelResponse = await response.json();
    const novel = data.pageProps;
    const chapterList = data.pageProps.chapterList || [];

    // Fetch first page to get totalPages
    const totalPages = Math.ceil(novel.book.chapterCount / 50);

    // Fetch all chapter pages
    for (let page = 2; page <= totalPages; page++) {
      const pageUrl = `${url}&page=${page}`;
      const chapterResponse = await fetch(pageUrl);
      
      if (!chapterResponse.ok) {
        throw new Error(`Failed to fetch novel: ${response.statusText}`);
      }

      const chapterData: NovelResponse = await chapterResponse.json();
      const novel = chapterData.pageProps;
      novel.chapterList = chapterData.pageProps.chapterList || [];
      for (const chapter of novel.chapterList) {
        chapterList.push(chapter);
      }
    }

    novel.chapterList = chapterList;
    const apiResponse: ApiResponse<Novel> = {
      success: true,
      data: novel,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Error fetching novel:', error);
    const apiResponse: ApiResponse<Novel> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(apiResponse, { status: 500 });
  }
}