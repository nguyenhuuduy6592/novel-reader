'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ImportIcon, BookOpenIcon } from '@/lib/icons';
import { Novel } from '@/types';
import { getAllNovels, getCurrentChapter } from '@/lib/indexedDB';
import Image from 'next/image';
import PageLayout from '@/components/PageLayout';

export default function HomeClient({ version }: { version: string }) {
  const [novels, setNovels] = useState<{ novel: Novel; currentChapterSlug: string | null; currentChapterName: string | null }[]>([]);

  useEffect(() => {
    const loadNovels = async () => {
      const rawNovels = await getAllNovels();
      // Load current chapters for each novel
      const novelsWithProgress = await Promise.all(
        rawNovels.map(async (novel) => {
          const currentChapterSlug = await getCurrentChapter(novel.book.slug);
          const currentChapterName = currentChapterSlug ?
            novel.chapters?.find(c => c.chapter.slug === currentChapterSlug)?.chapter.name || null
            : null;
          return { novel, currentChapterSlug, currentChapterName };
        })
      );
      setNovels(novelsWithProgress);
    };
    loadNovels();
  }, []);

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Novel Reader</h1>
          <span className="text-sm text-gray-500 font-medium">
            v{version}
          </span>
        </div>
        <Link
          href="/import"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          <ImportIcon />
          Import Novel
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">My Novels</h2>
          {novels.length === 0 ? (
            <p className="text-gray-500">No novels imported yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {novels.map(({ novel, currentChapterSlug, currentChapterName }) => {
                const firstChapterSlug = novel.chapters?.[0]?.chapter.slug || '';
                const chapterHref = currentChapterSlug ? `/novel/${novel.book.slug}/chapter/${currentChapterSlug}` : `/novel/${novel.book.slug}/chapter/${firstChapterSlug}`;
                return (
                  <div key={novel.book.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-fit">
                    <Link href={`/novel/${novel.book.slug}`} className="block mb-4">
                      <Image
                        src={novel.book.coverUrl}
                        alt={novel.book.name}
                        width={100}
                        height={150}
                        className="w-full object-cover rounded-md hover:opacity-90 transition-opacity duration-200 mb-2"
                        priority={true}
                      />
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:underline">{novel.book.name}</h3>
                    </Link>
                    <p className="text-gray-600 mb-2 text-sm">by {novel.book.author.name}</p>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-3">
                      Chapter count: {novel.book.chapterCount}
                      {currentChapterSlug && (
                        <span className="block mt-1 text-green-600 font-medium">
                          📖 Current: {currentChapterName || ''}
                        </span>
                      )}
                    </p>
                    <Link
                      href={chapterHref}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white font-medium transition-colors w-full ${
                        currentChapterSlug
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      <BookOpenIcon />
                      {currentChapterSlug ? 'Continue Reading' : 'Read Novel'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </PageLayout>
  );
}
