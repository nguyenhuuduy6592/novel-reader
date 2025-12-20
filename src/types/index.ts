export interface Novel {
  slug: string;
  title: string;
  author: string;
  description: string;
  cover: string;
  chapterCount: number;
  status: string;
  genres: string[];
  lastUpdated?: string;
}

export interface Chapter {
  slug: string;
  title: string;
  number: number;
}

export interface ChaptersResponse {
  chapters: Chapter[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ChapterContent {
  title: string;
  content: string;
  prevSlug?: string;
  nextSlug?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}