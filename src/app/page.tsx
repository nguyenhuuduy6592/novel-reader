'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Novel } from '@/types';
import { getAllNovels } from '@/lib/indexedDB';
import Image from 'next/image';

export default function Home() {
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    const loadNovels = async () => {
      const novels = await getAllNovels();
      setNovels(novels);
    };
    loadNovels();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Novel Reader</h1>
          <Link
            href="/import"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Import Novel
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">My Novels</h2>
          {novels.length === 0 ? (
            <p className="text-gray-500">No novels imported yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {novels.map((novel) => (
                <div key={novel.book.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <Image
                    src={novel.book.coverUrl}
                    alt={novel.book.name}
                    width={100}
                    height={150}
                    className="w-full h-48 object-cover rounded-md mb-4"
                    priority={true}
                  />
                  <h3 className="font-semibold text-lg mb-2">{novel.book.name}</h3>
                  <p className="text-gray-600 mb-2">by {novel.book.author.name}</p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">Chapter count: {novel.book.chapterCount}</p>
                  <Link
                    href={`/novel/${novel.book.slug}`}
                    className="inline-block px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    Read Novel
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
