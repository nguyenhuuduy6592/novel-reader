export interface NovelResponse {
  pageProps: Novel;
}

export interface Novel {
  book: BookInfo
  slug: string;
  title: string;
  author: string;
  description: string;
  cover: string;
  status: string;
  genres: string[];
  lastUpdated?: string;
  chapterList?: Chapter[];
}

export interface BookInfo {
  coverUrl: string;
  name: string;
  chapterCount: number
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