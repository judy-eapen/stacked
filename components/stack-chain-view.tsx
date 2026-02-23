'use client'

/** Visual habit stack chain: Anchor → This habit. Shown when habit has a stack anchor. */
export function StackChainView({
  anchorLabel,
  habitName,
  className = '',
}: {
  anchorLabel: string
  habitName: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap text-xs ${className}`}>
      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 truncate max-w-[120px]" title={anchorLabel}>
        {anchorLabel}
      </span>
      <span className="text-gray-400 shrink-0" aria-hidden>→</span>
      <span className="px-2 py-0.5 rounded bg-[#e87722]/10 text-gray-800 truncate max-w-[120px]" title={habitName}>
        {habitName}
      </span>
    </div>
  )
}
