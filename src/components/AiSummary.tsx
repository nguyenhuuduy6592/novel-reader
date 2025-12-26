'use client';

import { useEffect, useRef } from 'react';
import type { AiSettings } from '@/types';
import { LOCAL_STORAGE_KEYS } from '@/constants/storage';

interface AiSummaryProps {
  aiSettings: AiSettings | null;
  summary: string | null | undefined;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function AiSummary({ aiSettings, summary, isGenerating, error, onGenerate }: AiSummaryProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Restore collapsed state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.AI_SUMMARY_COLLAPSED);
    if (savedState === 'true' && detailsRef.current) {
      detailsRef.current.open = false;
    } else if (savedState === 'false' && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, []);

  // Hide completely if no AI settings, no API key is set, AND no summary exists
  // If a summary already exists, show it even without API key
  if (!aiSettings || (!aiSettings.providers[aiSettings.provider]?.apiKey && !summary)) {
    return null;
  }

  // Save collapsed state on toggle
  const handleToggle = () => {
    if (detailsRef.current) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AI_SUMMARY_COLLAPSED, detailsRef.current.open ? 'false' : 'true');
    }
  };

  // Loading state
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

  return (
    <>
      {/* Error display (shown above content when error exists) */}
      {error && (
        <details
          className="mb-4 group"
          onToggle={handleToggle}
          open
        >
          <summary className="cursor-pointer p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center justify-between transition-colors">
            <span className="font-semibold text-red-700">AI Summary Error</span>
            <span className="text-red-500 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-b-lg">
            <p className="text-red-600 text-sm whitespace-pre-line">{error}</p>
            <button
              onClick={onGenerate}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </details>
      )}

      {/* Content: either generate button or summary display */}
      {/* Hide generate button when there's an error (retry button is in error block) */}
      {!summary && !error ? (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 mb-2">No AI summary available.</p>
          <button
            onClick={onGenerate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm cursor-pointer"
          >
            Generate Summary
          </button>
        </div>
      ) : summary && (
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
      )}
    </>
  );
}
