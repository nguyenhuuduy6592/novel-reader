import { NextRequest, NextResponse } from 'next/server';
import { ChapterContent, ApiResponse, ChaptersResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterSlug: string }> }
) {
  try {
    const { slug, chapterSlug } = await params;

    const apiUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}/${chapterSlug}.html.json?slug=${slug}&slug=${chapterSlug}.html`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`Error fetching chapter: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch chapter: ${response.statusText}`);
    }

    const data: ChaptersResponse = await response.json();
    const apiResponse: ApiResponse<ChapterContent> = {
      success: true,
      data: data.pageProps,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse<ChapterContent> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(apiResponse, { status: 500 });
  }
}