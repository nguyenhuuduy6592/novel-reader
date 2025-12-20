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
  name: string;
  content: string;
}

export interface ChaptersResponse {
  pageProps: ChapterContent;
}

export interface ChapterContent {
  chapter: Chapter;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}