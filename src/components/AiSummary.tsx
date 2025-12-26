'use client';

import { useEffect, useRef } from 'react';

interface AiSummaryProps {
  apiKey: string;
  summary: string | null | undefined;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

const STORAGE_KEY = 'ai-summary-collapsed';

export function AiSummary({ apiKey, summary, isGenerating, error, onGenerate }: AiSummaryProps) {
  // Hide completely if no API key is set
  if (!apiKey) {
    return null;
  }

  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Restore collapsed state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState === 'true' && detailsRef.current) {
      detailsRef.current.open = false;
    } else if (savedState === 'false' && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, []);

  // Save collapsed state on toggle
  const handleToggle = () => {
    if (detailsRef.current) {
      localStorage.setItem(STORAGE_KEY, detailsRef.current.open ? 'false' : 'true');
    }
  };

  if (isGenerating) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-blue-700">Generating AI summary...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <details
        ref={detailsRef}
        className="mb-4 group"
        onToggle={handleToggle}
        open={false}
      >
        <summary className="cursor-pointer p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center justify-between transition-colors">
          <span className="font-semibold text-red-700">AI Summary Error</span>
          <span className="text-red-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-b-lg">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={onGenerate}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </details>
    );
  }

  if (!summary) {
    return (
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600 mb-2">No AI summary available.</p>
        <button
          onClick={onGenerate}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm cursor-pointer"
        >
          Generate Summary
        </button>
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      className="mb-4 group"
      onToggle={handleToggle}
      open={true}
    >
      <summary className="cursor-pointer p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-between transition-colors">
        <span className="font-semibold text-amber-800">AI Summary</span>
        <span className="text-amber-600 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-b-lg">
        <div className="prose prose-sm max-w-none text-amber-900 whitespace-pre-line mb-3">
          {summary}
        </div>
        <button
          onClick={onGenerate}
          className="px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 cursor-pointer"
        >
          Regenerate Summary
        </button>
      </div>
    </details>
  );
}
