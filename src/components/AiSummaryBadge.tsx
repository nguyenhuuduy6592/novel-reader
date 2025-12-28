interface AiSummaryBadgeProps {
  hasSummary: boolean
  showPlaceholder?: boolean
}

export function AiSummaryBadge({ hasSummary, showPlaceholder = false }: AiSummaryBadgeProps) {
  if (!hasSummary && !showPlaceholder) return null

  return hasSummary ? (
    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold" title="AI summary available">
      AI
    </span>
  ) : (
    <span className="flex-shrink-0 inline-block w-5 h-5" aria-hidden="true"></span>
  )
}
