'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Novel } from '@/types';
import { getAllNovels } from '@/lib/localStorage';
import { importNovel, importNovelFromJson } from '@/lib/importNovel';

export default function Home() {
  const [importMode, setImportMode] = useState<'url' | 'json'>('url');
  const [url, setUrl] = useState('https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/do-de-cua-ta-deu-la-trum-phan-dien.html.json?slug=do-de-cua-ta-deu-la-trum-phan-dien.html');
  const [json, setJson] = useState('');
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNovels(getAllNovels());
  }, []);

  const handleImport = async () => {
    if (importMode === 'url' && !url.trim()) return;
    if (importMode === 'json' && !json.trim()) return;

    setLoading(true);
    setError('');

    let result;
    if (importMode === 'url') {
      result = await importNovel(encodeURIComponent(url.trim()));
    } else {
      result = await importNovelFromJson(json.trim());
    }

    if (result.success) {
      setNovels(getAllNovels());
      // setUrl('');
      // setJson('');
    } else {
      setError(result.error || 'Failed to import novel');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Novel Reader</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Import Novel</h2>
          <div className="mb-4">
            <label className="mr-4">
              <input
                type="radio"
                value="url"
                checked={importMode === 'url'}
                onChange={(e) => setImportMode(e.target.value as 'url' | 'json')}
              />
              Import from URL
            </label>
            <label>
              <input
                type="radio"
                value="json"
                checked={importMode === 'json'}
                onChange={(e) => setImportMode(e.target.value as 'url' | 'json')}
              />
              Import from JSON
            </label>
            <Link
              href="/code-display"
              className="ml-4 text-blue-500 hover:text-blue-700 underline"
            >
              View Code
            </Link>
          </div>
          <div className="flex gap-4">
            {importMode === 'url' ? (
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter novel URL"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleImport()}
              />
            ) : (
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder="Paste novel JSON here"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
              />
            )}
            <button
              onClick={handleImport}
              disabled={loading || (importMode === 'url' ? !url.trim() : !json.trim())}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">My Novels</h2>
          {novels.length === 0 ? (
            <p className="text-gray-500">No novels imported yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {novels.map((novel) => (
                <div key={novel.book.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <img
                    src={novel.book.coverUrl}
                    alt={novel.book.name}
                    className="w-full h-48 object-cover rounded-md mb-4"
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
