'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getNovel, getCurrentChapter } from '@/lib/indexedDB';
import { Novel } from '@/types';
import Image from 'next/image';
import { HomeIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';

export default function NovelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [currentChapterSlug, setCurrentChapterSlug] = useState<string | null>(null);
  const [currentChapterName, setCurrentChapterName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadNovel = async () => {
      const n = await getNovel(slug);
      setNovel(n);
      const currentSlug = await getCurrentChapter(slug);
      const currentChapterName = currentSlug ?
        n?.chapters?.find(c => c.chapter.slug === currentSlug)?.chapter.name || null
        : null;
      setCurrentChapterSlug(currentSlug);
      setCurrentChapterName(currentChapterName);
      setIsLoading(false);
    };
    loadNovel();
  }, [slug]);

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <p className="text-gray-500">Loading novel...</p>
          ) : (
            <p className="text-red-500">Novel not found.</p>
          )}
          <br />
          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            <HomeIcon />
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Novel Details</h1>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          <HomeIcon />
          Home
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <Image
              src={novel.book.coverUrl}
              alt={novel.book.name}
              width={200}
              height={300}
              className="w-48 h-72 object-cover rounded-lg shadow-md hover:opacity-90 transition-opacity duration-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-4 line-clamp-2">{novel.book.name}</h1>
            <p className="text-xl text-gray-600 mb-4">by {novel.book.author.name}</p>
            <div className="mb-6">
              <span className="text-lg text-gray-500">
                {novel.book.chapterCount} chapters
                {currentChapterSlug && (
                  <span className="ml-4 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    📖 Current: {currentChapterName || ''}
                  </span>
                )}
              </span>
            </div>
            <Link
              href={currentChapterSlug ? `/novel/${slug}/chapter/${currentChapterSlug}` : `/novel/${slug}/chapter/${novel.chapters?.[0]?.chapter.slug || ''}`}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-lg transition-colors w-fit ${
                currentChapterSlug
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {currentChapterSlug ? '📖 Continue Reading' : '🎯 Start Reading'}
            </Link>
          </div>
        </div>

        {novel.chapters && novel.chapters.length > 0 && (
          <div className="mt-4">
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search chapters..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <h2 className="text-lg font-bold mb-2">Chapters</h2>
            <div className="space-y-0.5">
              {novel.chapters
                .filter((chapterInfo) =>
                  chapterInfo.chapter.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((chapterInfo, index) => (
                <Link
                  key={chapterInfo.chapter.slug}
                  href={`/novel/${slug}/chapter/${chapterInfo.chapter.slug}`}
                  className="block p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-xs"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {chapterInfo.chapter.aiSummary ? (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold" title="AI summary available">
                          AI
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-block w-5 h-5"></span>
                      )}
                      <span className="font-medium truncate">Ch {index + 1}: {chapterInfo.chapter.name}</span>
                    </div>
                    <span className="text-gray-500 text-xs flex-shrink-0">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}