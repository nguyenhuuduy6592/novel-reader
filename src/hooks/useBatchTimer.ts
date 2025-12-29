import { useState, useEffect, useRef, useCallback } from 'react'
import { calculateAverageTime } from '@/lib/timeUtils'

/**
 * React hook for tracking time during batch operations
 *
 * Features:
 * - Elapsed time updates every second while running
 * - Tracks completed count and max concurrency
 * - Records individual chapter durations (start to finish) for precise average
 * - Calculates final statistics (total time, average per chapter)
 *
 * Usage:
 * ```tsx
 * const batchTimer = useBatchTimer()
 * batchTimer.start(totalCount)  // Begin timing
 * batchTimer.startChapter()  // Call before starting a chapter's API call
 * batchTimer.recordSuccessTime()  // Call after chapter completes successfully
 * batchTimer.stop()  // Calculate final stats
 * ```
 */

export interface BatchTimerState {
  isRunning: boolean
  elapsedSeconds: number
  completedCount: number
  successCount: number
  totalCount: number
  maxConcurrency: number
  chapterDurations: number[]  // Individual durations for each successful chapter (start to finish)
}

export interface BatchTimerStats {
  totalSeconds: number
  averageSecondsPerChapter: number
  maxConcurrency: number
  successCount: number
}

export interface UseBatchTimerReturn {
  state: BatchTimerState
  stats: BatchTimerStats | null
  start: (totalCount: number, maxConcurrency?: number) => void
  stop: () => void
  reset: () => void
  updateCompleted: (count: number) => void
  updateSuccess: (count: number) => void
  startChapter: () => void
  recordSuccessTime: () => void
  updateMaxConcurrency: (level: number) => void
}

/**
 * Hook for tracking time during batch operations
 * Provides elapsed time updates every second and calculates final statistics
 */
export function useBatchTimer(): UseBatchTimerReturn {
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chapterStartRef = useRef<number | null>(null)  // Tracks when current chapter started

  const [state, setState] = useState<BatchTimerState>({
    isRunning: false,
    elapsedSeconds: 0,
    completedCount: 0,
    successCount: 0,
    totalCount: 0,
    maxConcurrency: 1,
    chapterDurations: [],
  })

  const [stats, setStats] = useState<BatchTimerStats | null>(null)

  // Update elapsed time every second while running
  useEffect(() => {
    if (!state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (!startTimeRef.current) return prev
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        return { ...prev, elapsedSeconds: elapsed }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isRunning])

  const start = useCallback((totalCount: number, maxConcurrency = 1) => {
    startTimeRef.current = Date.now()
    setState({
      isRunning: true,
      elapsedSeconds: 0,
      completedCount: 0,
      successCount: 0,
      totalCount,
      maxConcurrency,
      chapterDurations: [],
    })
    setStats(null)
  }, [])

  const stop = useCallback(() => {
    setState(prev => {
      if (!prev.isRunning) return prev

      // Calculate final stats using utility functions
      const totalSeconds = prev.elapsedSeconds
      const successCount = prev.successCount

      // Calculate average from individual chapter durations
      let averageSecondsPerChapter = 0
      if (prev.chapterDurations.length > 0) {
        const sum = prev.chapterDurations.reduce((a, b) => a + b, 0)
        averageSecondsPerChapter = sum / prev.chapterDurations.length
      }

      setStats({
        totalSeconds,
        averageSecondsPerChapter,
        maxConcurrency: prev.maxConcurrency,
        successCount,
      })

      return { ...prev, isRunning: false }
    })

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    startTimeRef.current = null
    chapterStartRef.current = null
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setState({
      isRunning: false,
      elapsedSeconds: 0,
      completedCount: 0,
      successCount: 0,
      totalCount: 0,
      maxConcurrency: 1,
      chapterDurations: [],
    })
    setStats(null)
  }, [])

  const updateCompleted = useCallback((count: number) => {
    setState(prev => ({ ...prev, completedCount: count }))
  }, [])

  const updateSuccess = useCallback((count: number) => {
    setState(prev => ({ ...prev, successCount: count }))
  }, [])

  // Call this before starting to process a chapter
  const startChapter = useCallback(() => {
    chapterStartRef.current = Date.now()
  }, [])

  // Call this after chapter completes successfully
  const recordSuccessTime = useCallback(() => {
    const now = Date.now()
    const chapterStart = chapterStartRef.current

    if (chapterStart !== null) {
      const duration = (now - chapterStart) / 1000
      setState(prev => ({
        ...prev,
        chapterDurations: [...prev.chapterDurations, duration],
      }))
    }
  }, [])

  const updateMaxConcurrency = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      maxConcurrency: Math.max(prev.maxConcurrency, level),
    }))
  }, [])

  return { state, stats, start, stop, reset, updateCompleted, updateSuccess, startChapter, recordSuccessTime, updateMaxConcurrency }
}
