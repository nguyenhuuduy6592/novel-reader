import { NextRequest, NextResponse } from 'next/server';
import { Novel, ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch novel: ${response.statusText}`);
    }

    const data: Novel = await response.json();

    const apiResponse: ApiResponse<Novel> = {
      success: true,
      data,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse<Novel> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(apiResponse, { status: 500 });
  }
}