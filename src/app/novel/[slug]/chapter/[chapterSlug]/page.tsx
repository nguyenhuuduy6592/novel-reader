'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChapterContent } from '@/types';

export default function ChapterPage() {
  const params = useParams();
  const slug = params.slug as string;
  const chapterSlug = params.chapterSlug as string;
  const [chapter, setChapter] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChapter();
  }, [slug, chapterSlug]);

  const fetchChapter = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/chapter/${slug}/${chapterSlug}`);
      const data = await response.json();

      if (data.success) {
        setChapter(data.data);
      } else {
        setError(data.error || 'Failed to fetch chapter');
      }
    } catch (err) {
      setError('Failed to fetch chapter');
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading chapter...</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Chapter not found'}</p>
          <Link href={`/novel/${slug}/chapters`} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Back to Chapters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <Link href={`/novel/${slug}`} className="text-blue-500 hover:underline">
              ← Novel Info
            </Link>
            <Link href={`/novel/${slug}/chapters`} className="text-blue-500 hover:underline">
              Chapters
            </Link>
          </div>
          <div className="flex gap-2">
            {chapter.prevSlug && (
              <Link
                href={`/novel/${slug}/chapter/${chapter.prevSlug}`}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Previous
              </Link>
            )}
            {chapter.nextSlug && (
              <Link
                href={`/novel/${slug}/chapter/${chapter.nextSlug}`}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Next
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">{chapter.title}</h1>

          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: chapter.content }}
          />
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {chapter.prevSlug && (
            <Link
              href={`/novel/${slug}/chapter/${chapter.prevSlug}`}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              ← Previous Chapter
            </Link>
          )}
          {chapter.nextSlug && (
            <Link
              href={`/novel/${slug}/chapter/${chapter.nextSlug}`}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Next Chapter →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}