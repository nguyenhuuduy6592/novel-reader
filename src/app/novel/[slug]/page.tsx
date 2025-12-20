'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Novel } from '@/types';
import { getNovel, saveNovel } from '@/lib/localStorage';
import { importNovel } from '@/lib/importNovel';

export default function NovelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedNovel = getNovel(slug);
    setNovel(storedNovel);
  }, [slug]);

  const handleRefetch = async () => {
    setLoading(true);
    setError('');

    const result = await importNovel(slug);
    if (result.success) {
      const updatedNovel = getNovel(slug);
      setNovel(updatedNovel);
    } else {
      setError(result.error || 'Failed to refetch novel');
    }

    setLoading(false);
  };

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Novel not found. Import it first.</p>
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
          <div className="flex flex-col md:flex-row gap-2">
            <img
              src={novel.book.coverUrl}
              alt={novel.book.name}
              className="w-full md:w-24 h-32 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold mb-0.5 truncate">{novel.book.name}</h1>
              <p className="text-base text-gray-600 mb-1 truncate">by {novel.book.author.name}</p>
              <div className="mb-1">
                <span className="text-gray-500 text-xs">{novel.book.chapterCount} chapters</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleRefetch}
                  disabled={loading}
                  className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {loading ? 'Refetching...' : 'Refetch'}
                </button>
              </div>
              {error && <p className="text-red-500 mt-0.5 text-xs">{error}</p>}
            </div>
          </div>

          {novel.chapterList && novel.chapterList.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-bold mb-2">Chapters</h2>
              <div className="space-y-0.5">
                {novel.chapterList.map((chapter, index) => (
                  <Link
                    key={chapter.slug}
                    href={`/novel/${slug}/chapter/${chapter.slug}`}
                    className="block p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium truncate">Ch {index + 1}: {chapter.name}</span>
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