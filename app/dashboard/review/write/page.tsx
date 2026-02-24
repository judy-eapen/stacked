'use client'

import { useSearchParams } from 'next/navigation'
import { WeeklyReviewContent, getWeekStart } from '../weekly-review-content'

export default function WriteReviewPage() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const initialWeekStart = dateParam
    ? dateParam.slice(0, 10)
    : getWeekStart(new Date())

  return (
    <WeeklyReviewContent
      initialWeekStart={initialWeekStart}
      showBackLink
      title="Weekly Review"
    />
  )
}
