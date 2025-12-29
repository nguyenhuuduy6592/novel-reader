/**
 * Time utilities for formatting and calculating durations
 *
 * All functions are pure and testable with no side effects.
 * Used by batch AI summary generation to display timing statistics.
 *
 * Functions:
 * - formatDuration(): Convert seconds to human-readable string
 * - calculateAverageTime(): Compute average time per item
 */

/**
 * Format seconds as a decimal string (e.g., 45.2 -> "45.2s")
 */
export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(1)}s`
}

/**
 * Calculate average time per chapter
 */
export function calculateAverageTime(totalSeconds: number, chapterCount: number): number {
  if (chapterCount === 0) return 0
  return totalSeconds / chapterCount
}
