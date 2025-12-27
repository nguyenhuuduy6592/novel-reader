import type { AiProvider } from '@/constants/ai';

export interface GenericResponse<T> {
  pageProps: T;
}

export interface Novel {
  book: NovelInfo
  chapters?: ChapterInfo[];
  lastReadAt?: string;
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
  aiSummary?: string;
}

export interface ChapterInfo {
  chapter: ChapterContent;
  nextChapter?: ChapterContent | undefined;
  prevChapter?: ChapterContent | undefined;
}

export interface ReadingThemeConfig {
  fontFamily: 'serif' | 'sans-serif' | 'monospace';
  fontSize: number; // in px, default 16
  background: 'light' | 'dark' | 'sepia' | 'night';
  lineHeight: number; // default 1.6
  padding: 'compact' | 'normal' | 'wide' | 'full'; // default 'normal'
}

export interface CurrentChapter {
  novelSlug: string;
  chapterSlug: string;
}

export interface AiProviderConfig {
  apiKey: string;
  model: string;
}

export interface AiSettings {
  provider: AiProvider;
  providers: Record<AiProvider, AiProviderConfig>;
  autoGenerate: boolean;
  summaryLength: 'short' | 'medium';
}