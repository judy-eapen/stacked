'use client'

/** One-line explainer subtitle for methodology terms. PRD: all methodology terms display a one-line explainer. */
export function ConceptExplainer({
  term,
  children,
  className = '',
}: {
  term: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-gray-900">{term}</p>
      <p className="text-xs text-gray-500 mt-0.5">{children}</p>
    </div>
  )
}
