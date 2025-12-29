'use client'

import { formatDuration } from '@/lib/timeUtils'
import type { BatchTimerStats } from '@/hooks/useBatchTimer'

interface BatchStatsProps {
  stats: BatchTimerStats
  totalCount: number
  variant?: 'success' | 'cancelled'
}

/**
 * Displays final statistics after batch generation completes or is cancelled
 */
export function BatchStats({
  stats,
  totalCount,
  variant = 'success',
}: BatchStatsProps) {
  const {
    totalSeconds,
    averageSecondsPerChapter,
    maxConcurrency,
    successCount,
  } = stats

  const bgColor = variant === 'success' ? 'bg-green-50' : 'bg-yellow-50'
  const borderColor = variant === 'success' ? 'border-green-200' : 'border-yellow-200'
  const textColor = variant === 'success' ? 'text-green-800' : 'text-yellow-800'
  const subTextColor = variant === 'success' ? 'text-green-700' : 'text-yellow-700'

  return (
    <div className={`mb-4 p-4 ${bgColor} border ${borderColor} rounded-lg`}>
      <p className={`${textColor} font-medium mb-2`}>
        {variant === 'success' ? 'Successfully generated' : 'Generation cancelled'} - {successCount}/{totalCount} summaries
      </p>
      <div className={`${subTextColor} text-sm space-y-1`}>
        <div className="flex justify-between gap-4">
          <span>Total time:</span>
          <span className="font-medium">{formatDuration(totalSeconds)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Average per chapter:</span>
          <span className="font-medium">{formatDuration(averageSecondsPerChapter)}</span>
        </div>
        {maxConcurrency > 1 && (
          <div className="flex justify-between gap-4">
            <span>Max concurrency:</span>
            <span className="font-medium">{maxConcurrency}</span>
          </div>
        )}
      </div>
    </div>
  )
}
