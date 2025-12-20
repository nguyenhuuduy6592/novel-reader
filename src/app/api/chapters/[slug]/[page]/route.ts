import { NextRequest, NextResponse } from 'next/server';
import { ChaptersResponse, ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; page: string }> }
) {
  try {
    const { slug, page } = await params;
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new Error('Invalid page number');
    }

    const apiUrl = `https://truyenchucv.org/api/chapters/${slug}?page=${pageNum}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapters: ${response.statusText}`);
    }

    const data: ChaptersResponse = await response.json();

    const apiResponse: ApiResponse<ChaptersResponse> = {
      success: true,
      data,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse<ChaptersResponse> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(apiResponse, { status: 500 });
  }
}