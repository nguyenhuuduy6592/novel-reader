import { Novel } from '@/types';

const NOVELS_KEY = 'novels';

export function saveNovel(novel: Novel): void {
  if (typeof window === 'undefined') return;

  const novels = getAllNovels();
  const existingIndex = novels.findIndex(n => n.book.slug === novel.book.slug);

  if (existingIndex >= 0) {
    novels[existingIndex] = novel;
  } else {
    novels.push(novel);
  }

  localStorage.setItem(NOVELS_KEY, JSON.stringify(novels));
}

export function getNovel(slug: string): Novel | null {
  if (typeof window === 'undefined') return null;

  const novels = getAllNovels();
  return novels.find(n => n.book.slug === slug) || null;
}

export function getAllNovels(): Novel[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(NOVELS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function removeNovel(slug: string): void {
  if (typeof window === 'undefined') return;

  const novels = getAllNovels().filter(n => n.book.slug !== slug);
  localStorage.setItem(NOVELS_KEY, JSON.stringify(novels));
}