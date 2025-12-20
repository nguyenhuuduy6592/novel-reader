export interface NovelResponse {
  pageProps: Novel;
}

export interface Novel {
  book: BookInfo
  chapterList?: Chapter[];
}

export interface BookInfo {
  bookId: number;
  slug: string;
  coverUrl: string;
  name: string;
  chapterCount: number
  author: AuthorInfo;
}

export interface AuthorInfo {
  name: string;
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