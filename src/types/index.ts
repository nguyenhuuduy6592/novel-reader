export interface GenericResponse<T> {
  pageProps: T;
}

export interface Novel {
  book: NovelInfo
  chapterList?: ChapterInfo[];
}

export interface NovelInfo {
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

export interface ChapterContent {
  slug?: string | undefined;
  name: string;
  content: string;
}

export interface ChapterInfo {
  chapter: ChapterContent;
  nextChapter?: ChapterContent | undefined;
  prevChapter?: ChapterContent | undefined;
}