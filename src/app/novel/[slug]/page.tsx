'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getNovel } from '@/lib/indexedDB';
import { Novel } from '@/types';
import Image from 'next/image';

export default function NovelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNovel = async () => {
      const n = await getNovel(slug);
      setNovel(n);
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
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 px-1">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-2 rounded shadow-sm">
          <Link href="/" className="text-blue-500 hover:text-blue-700 mb-2 inline-block">← Back to Home</Link>
          <div className="flex flex-col md:flex-row gap-2">
            <Image
              src={novel.book.coverUrl}
              alt={novel.book.name}
              width={100}
              height={150}
              className="w-full md:w-24 h-32 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold mb-0.5 truncate">{novel.book.name}</h1>
              <p className="text-base text-gray-600 mb-1 truncate">by {novel.book.author.name}</p>
              <div className="mb-1">
                <span className="text-gray-500 text-xs">{novel.book.chapterCount} chapters</span>
              </div>
            </div>
          </div>

          {novel.chapters && novel.chapters.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-bold mb-2">Chapters</h2>
              <div className="space-y-0.5">
                {novel.chapters.map((chapterInfo, index) => (
                  <Link
                    key={chapterInfo.chapter.slug}
                    href={`/novel/${slug}/chapter/${chapterInfo.chapter.slug}`}
                    className="block p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium truncate">Ch {index + 1}: {chapterInfo.chapter.name}</span>
                      <span className="text-gray-500 text-xs">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}