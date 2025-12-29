'use client'

import { formatDuration } from '@/lib/timeUtils'
import type { BatchTimerState } from '@/hooks/useBatchTimer'

interface BatchProgressProps {
  timerState: BatchTimerState
  isZaiProvider?: boolean
  onCancel?: () => void
}

/**
 * Displays batch generation progress with elapsed time and concurrency
 */
export function BatchProgress({
  timerState,
  isZaiProvider = false,
  onCancel,
}: BatchProgressProps) {
  const { elapsedSeconds, completedCount, successCount, totalCount, maxConcurrency, chapterDurations } = timerState

  // Calculate average time from individual chapter durations
  const avgTime = chapterDurations.length > 0
    ? chapterDurations.reduce((sum, time) => sum + time, 0) / chapterDurations.length
    : 0

  return (
    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="flex flex-col">
          <span className="text-purple-800 font-medium">
            Generating summaries: {completedCount}/{totalCount}
          </span>
          <span className="text-purple-600 text-sm flex items-center gap-2">
            <span>Time: {formatDuration(elapsedSeconds)}</span>
            {successCount > 0 && (
              <>
                <span>•</span>
                <span>Avg: {formatDuration(avgTime)}</span>
              </>
            )}
            {isZaiProvider && (
              <>
                <span>•</span>
                <span>Concurrency: {maxConcurrency}</span>
              </>
            )}
          </span>
        </div>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
