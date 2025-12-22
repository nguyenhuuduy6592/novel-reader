'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getNovel } from '@/lib/indexedDB';
import { ChapterInfo } from '@/types';

export default function ChapterPage() {
  const params = useParams();
  const slug = params.slug as string;
  const chapterSlug = params.chapterSlug as string;
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChapter = async () => {
      const novel = await getNovel(slug);
      if (novel && novel.chapters) {
        const ch = novel.chapters.find(c => c.chapter.slug === chapterSlug);
        
        if (ch) {
          ch.chapter.content = ch.chapter.content
            .split('\n')
            .filter(line => line.trim())
            .map(line => `<p>${line.trim()}</p>`)
            .join('');
          setChapter(ch || null);
        }
        
        setIsLoading(false);
      }
    };
    loadChapter();
  }, [slug, chapterSlug]);

  if (chapter === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <p className="text-gray-500">Loading chapter...</p>
          ) : (
            <p className="text-red-500">Chapter not found.</p>
          )}
          <br />
          <Link href={`/novel/${slug}`} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Back to Novel
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
          </div>
          <div className="flex gap-2">
            {chapter.prevChapter && (
              <Link
                href={`/novel/${slug}/chapter/${chapter.prevChapter.slug}`}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Previous
              </Link>
            )}
            {chapter.nextChapter && (
              <Link
                href={`/novel/${slug}/chapter/${chapter.nextChapter.slug}`}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Next
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">{chapter.chapter.name}</h1>

          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: chapter.chapter.content }}
          />
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {chapter.prevChapter && (
            <Link
              href={`/novel/${slug}/chapter/${chapter.prevChapter.slug}`}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              ← Previous Chapter
            </Link>
          )}
          {chapter.nextChapter && (
            <Link
              href={`/novel/${slug}/chapter/${chapter.nextChapter.slug}`}
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