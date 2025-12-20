import { NextRequest, NextResponse } from 'next/server';
import { ChapterContent, ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterSlug: string }> }
) {
  try {
    const { slug, chapterSlug } = await params;
    const apiUrl = `https://truyenchucv.org/api/chapter/${slug}/${chapterSlug}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter: ${response.statusText}`);
    }

    const data: ChapterContent = await response.json();

    const apiResponse: ApiResponse<ChapterContent> = {
      success: true,
      data,
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