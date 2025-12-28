'use client';

import Link from 'next/link';
import { ChapterInfo } from '@/types';
import { AiSummaryBadge } from '@/components/AiSummaryBadge';

interface ChapterSummaryCardProps {
  slug: string
  chapter: ChapterInfo
  isActive: boolean
  index: number
}

export function ChapterSummaryCard({ slug, chapter, isActive, index }: ChapterSummaryCardProps) {
  const { slug: chapterSlug, name: chapterName, aiSummary } = chapter.chapter

  return (
    <div
      id={`chapter-${chapterSlug}`}
      className={`
        p-4 rounded-lg border-2 transition-all duration-200
        ${isActive
          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <Link
        href={`/novel/${slug}/chapter/${chapterSlug}`}
        className="block"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-gray-900">
                Ch {index + 1}: {chapterName}
              </h3>
              <AiSummaryBadge hasSummary={!!aiSummary} />
            </div>
            {aiSummary ? (
              <p className="text-gray-600 text-sm leading-relaxed">
                {aiSummary}
              </p>
            ) : (
              <p className="text-gray-400 text-sm italic">
                AI summary not generated
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            {isActive && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
