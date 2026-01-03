'use client';

import Link from 'next/link';
import { ChapterInfo, ReadingThemeConfig } from '@/types';

interface ChapterSummaryCardProps {
  slug: string
  chapter: ChapterInfo
  isActive: boolean
  index: number
  themeConfig: ReadingThemeConfig
}

export function ChapterSummaryCard({ slug, chapter, isActive, index, themeConfig }: ChapterSummaryCardProps) {
  const { slug: chapterSlug, name: chapterName, aiSummary } = chapter.chapter

  return (
    <div
      id={`chapter-${chapterSlug}`}
      className={`
        reading-${themeConfig.background}
        rounded-lg border-2 transition-all duration-200
        ${isActive
          ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
          : 'border-current/20 hover:border-current/40 hover:shadow-md'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <Link
        href={`/novel/${slug}/chapter/${chapterSlug}`}
        className="block"
      >
        <div className="reading-content rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg">
                  Ch {index + 1}: {chapterName}
                </h3>
              </div>
              {aiSummary ? (
                <p className="opacity-80">
                  {aiSummary}
                </p>
              ) : (
                <p className="italic opacity-50">
                  AI summary not generated
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

