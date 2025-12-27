'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { HomeIcon, ImportIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import packageJson from '../../../package.json';

export default function Page() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch(`/browserNovelExtractor.js?v=${packageJson.version}`)
      .then(res => res.text())
      .then(text => {
        setContent(text);
      })
      .catch(() => {
        setError('Failed to fetch content');
      })
      .finally(() => setLoading(false));
  }, [packageJson.version]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <PageLayout padding="p-5">
        <h1 className="text-3xl font-bold mb-4">Browser Novel Extractor Code</h1>
        <p>Loading...</p>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout padding="p-5">
        <h1 className="text-3xl font-bold mb-4">Browser Novel Extractor Code</h1>
        <p className="text-red-500">{error}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout padding="p-5">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Browser Novel Extractor Code</h1>
        <div className="flex gap-2">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer">
            <HomeIcon />
            Home
          </Link>
          <Link href="/import" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer">
            <ImportIcon />
            Import
          </Link>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
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
    </PageLayout>
  );
}
