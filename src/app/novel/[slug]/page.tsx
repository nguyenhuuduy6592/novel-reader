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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row gap-6">
            <img
              src={novel.cover}
              alt={novel.title}
              className="w-full md:w-48 h-64 object-cover rounded-md"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{novel.title}</h1>
              <p className="text-xl text-gray-600 mb-4">by {novel.author}</p>
              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mr-2">
                  {novel.status}
                </span>
                <span className="text-gray-500">{novel.chapterCount} chapters</span>
              </div>
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Genres:</h3>
                <div className="flex flex-wrap gap-2">
                  {novel.genres.map((genre) => (
                    <span key={genre} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-6">{novel.description}</p>
              <div className="flex gap-4">
                <button
                  onClick={handleRefetch}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Refetching...' : 'Refetch Data'}
                </button>
                <Link
                  href={`/novel/${slug}/chapters`}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  View Chapters
                </Link>
              </div>
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}