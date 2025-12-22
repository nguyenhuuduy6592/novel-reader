'use client';

import { useState } from 'react';
import Link from 'next/link';
import { importNovelFromJson } from '@/lib/importNovel';

export default function ImportPage() {
  const [json, setJson] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setFileContent(text);
        setJson('');
      } catch (error) {
        setError('Failed to read file');
      }
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    let jsonContent = (fileContent || json).trim();

    // If it's a URL, fetch the JSON
    if (jsonContent.startsWith('http')) {
      try {
        const response = await fetch(jsonContent);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        jsonContent = await response.text();
      } catch (fetchError) {
        setError(`Failed to fetch URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        setLoading(false);
        return;
      }
    }

    const result = await importNovelFromJson(jsonContent);

    if (result.success) {
      setSuccess(true);
      setJson('');
    } else {
      setError(result.error || 'Failed to import novel');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Import Novel</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Back to Home
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import from JSON
            </label>
            <Link
              href="/code-display"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              View Code
            </Link>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <div className="flex-1 space-y-2">
                <textarea
                  value={json}
                  onChange={(e) => setJson(e.target.value)}
                  placeholder="Paste novel JSON here or enter JSON URL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={loading || !(json.trim() || fileContent)}
                className="px-6 py-16 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed self-start md:self-auto whitespace-nowrap"
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          {success && (
            <div className="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              Novel imported successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}