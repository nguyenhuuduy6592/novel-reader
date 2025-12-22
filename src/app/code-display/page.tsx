'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
      <div style={{ padding: '20px' }}>
        <h1>Browser Novel Extractor Code</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Browser Novel Extractor Code</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Link href="/" style={{ marginBottom: '10px', display: 'inline-block' }}>← Back to Home</Link>
      <h1>Browser Novel Extractor Code</h1>
      <button
        onClick={handleCopy}
        className={`mb-2.5 px-5 py-2.5 text-white rounded cursor-pointer border-none ${copied ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 focus:bg-green-700' : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700'}`}
      >
        {copied ? 'Copied!' : 'Copy Code'}
      </button>
      <textarea
        value={content}
        readOnly
        style={{
          width: '100%',
          height: '80vh',
          fontFamily: 'monospace',
          fontSize: '14px',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          resize: 'none'
        }}
      />
    </div>
  );
}