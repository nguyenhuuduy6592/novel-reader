'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Novel, ChaptersResponse, Chapter } from '@/types';
import { getNovel } from '@/lib/localStorage';

export default function ChaptersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedNovel = getNovel(slug);
    setNovel(storedNovel);
  }, [slug]);

  useEffect(() => {
    if (novel) {
      fetchChapters(currentPage);
    }
  }, [novel, currentPage]);

  const fetchChapters = async (page: number) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/chapters/${slug}/${page}`);
      const data = await response.json();

      if (data.success) {
        setChapters(data.data.chapters);
        setTotalPages(data.data.totalPages);
      } else {
        setError(data.error || 'Failed to fetch chapters');
      }
    } catch (err) {
      setError('Failed to fetch chapters');
    }

    setLoading(false);
  };

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Novel not found.</p>
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
        <div className="mb-6">
          <Link href={`/novel/${slug}`} className="text-blue-500 hover:underline">
            ← Back to {novel.title}
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Chapters - {novel.title}</h1>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          {loading ? (
            <p className="text-center py-8">Loading chapters...</p>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-gray-600">Page {currentPage} of {totalPages}</p>
              </div>

              <div className="space-y-2 mb-6">
                {chapters.map((chapter) => (
                  <Link
                    key={chapter.slug}
                    href={`/novel/${slug}/chapter/${chapter.slug}`}
                    className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Chapter {chapter.number}: {chapter.title}</span>
                      <span className="text-gray-500">→</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}