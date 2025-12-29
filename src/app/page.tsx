'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImportIcon, BookOpenIcon, RefreshIcon, CheckIcon } from '@/lib/icons';
import { Novel } from '@/types';
import { getAllNovels, getCurrentChapter, unmarkNovelCompleted } from '@/lib/indexedDB';
import Image from 'next/image';
import PageLayout from '@/components/PageLayout';
import { CurrentChapter } from '@/lib/indexedDB';
import packageJson from '../../package.json';

export default function Home() {
  const router = useRouter();
  const [novels, setNovels] = useState<{ novel: Novel; currentChapter: CurrentChapter | null }[]>([]);

  const handleStartAgain = async (novelSlug: string) => {
    await unmarkNovelCompleted(novelSlug);
    router.push(`/novel/${novelSlug}`);
  };

  useEffect(() => {
    const loadNovels = async () => {
      const rawNovels = await getAllNovels();
      // Load current chapters for each novel
      const novelsWithProgress = await Promise.all(
        rawNovels.map(async (novel) => {
          const currentChapter = await getCurrentChapter(novel.book.slug);
          return {
            novel,
            currentChapter
          };
        })
      );

      // Sort by lastReadAt (most recent first), novels without lastReadAt go to the end
      novelsWithProgress.sort((a, b) => {
        const aTime = a.novel.lastReadAt ? new Date(a.novel.lastReadAt).getTime() : 0;
        const bTime = b.novel.lastReadAt ? new Date(b.novel.lastReadAt).getTime() : 0;
        return bTime - aTime;
      });

      setNovels(novelsWithProgress);
    };
    loadNovels();
  }, []);

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-1 md:gap-4">
          <h1 className="text-3xl font-bold whitespace-nowrap">Novel Reader</h1>
          <span className="text-sm text-gray-500 font-medium">
            v{packageJson.version}
          </span>
        </div>
        <Link
          href="/import"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 whitespace-nowrap sm:justify-start"
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
              {novels.map(({ novel, currentChapter }) => {
                const isCompleted = !!novel.completedAt;
                // For new novels without current chapter, link to the novel detail page
                const chapterHref = currentChapter?.chapterSlug
                  ? `/novel/${novel.book.slug}/chapter/${currentChapter.chapterSlug}`
                  : `/novel/${novel.book.slug}`;
                return (
                  <div key={novel.book.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-fit">
                    <Link href={`/novel/${novel.book.slug}`} className="block mb-4">
                      <Image
                        src={novel.book.coverUrl}
                        alt={novel.book.name}
                        width={100}
                        height={150}
                        className="w-full object-cover rounded-md hover:opacity-90 transition-opacity duration-200 mb-2"
                        priority
                        loading="eager"
                      />
                      <h3 className="font-semibold text-lg mb-2 hover:underline break-words">{novel.book.name}</h3>
                    </Link>
                    <p className="text-gray-600 mb-3 text-sm">by {novel.book.author.name}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      Chapter count: {novel.book.chapterCount}
                    </p>
                    {!isCompleted && currentChapter?.chapterSlug && (
                      <p className="text-xs text-green-600 mb-3 font-medium break-words" title={currentChapter.chapterName || ''}>
                        📖 Current: {currentChapter.chapterName || currentChapter?.chapterSlug || ''}
                      </p>
                    )}
                    {isCompleted ? (
                      <>
                        <p className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium mb-3 text-center flex items-center justify-center gap-1">
                          <CheckIcon />
                          Completed
                        </p>
                        <button
                          onClick={() => handleStartAgain(novel.book.slug)}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white font-medium transition-colors w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 focus:bg-amber-700 cursor-pointer"
                        >
                          <RefreshIcon />
                          Start Again
                        </button>
                      </>
                    ) : (
                      <Link
                        href={chapterHref}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white font-medium transition-colors w-full ${
                          currentChapter?.chapterSlug
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        <BookOpenIcon />
                        {currentChapter?.chapterSlug ? 'Continue Reading' : 'Read Novel'}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </PageLayout>
  );
}
