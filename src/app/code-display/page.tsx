'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HomeIcon, ImportIcon } from '@/lib/icons';

export default function Page() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/code')
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setContent(data.content);
        } else {
          setError(data.error || 'Failed to load content');
        }
      })
      .catch(err => {
        setError('Failed to fetch content');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (loading) {
    return (
      <div className="p-5">
        <h1 className="text-3xl font-bold mb-4">Browser Novel Extractor Code</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <h1 className="text-3xl font-bold mb-4">Browser Novel Extractor Code</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="mb-6 flex gap-2">
        <Link href="/" className="text-blue-500 hover:underline flex items-center gap-1 px-2 py-1">
          <HomeIcon />
          Home
        </Link>
        <Link href="/import" className="text-blue-500 hover:underline flex items-center gap-1 px-2 py-1">
          <ImportIcon />
          Import
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-4">Browser Novel Extractor Code</h1>
      <button
        onClick={handleCopy}
        className={`mb-2.5 px-5 py-2.5 text-white rounded cursor-pointer border-none ${copied ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 focus:bg-green-700' : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700'}`}
      >
        {copied ? 'Copied!' : 'Copy Code'}
      </button>
      <textarea
        value={content}
        readOnly
        className="w-full h-[80vh] font-mono text-sm p-2.5 border border-gray-300 rounded resize-none"
      />
    </div>
  );
}