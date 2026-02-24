'use client'

import Link from 'next/link'
import { WeeklyReviewContent, getWeekStart } from './weekly-review-content'

export default function ReviewPage() {
  const currentWeekStart = getWeekStart(new Date())

  return (
    <div className="space-y-6">
      <WeeklyReviewContent
        initialWeekStart={currentWeekStart}
        title="Review"
        showCustomWeekLink
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-foreground mb-2">
          Other tools
        </h2>
        <p className="font-body text-xs text-muted-foreground mb-3">
          Scorecard diagnostic, reset, and past reviews.
        </p>
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/dashboard/review/write"
              className="font-body text-sm font-medium text-primary hover:underline"
            >
              Review a different week
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground">·</span>
          </li>
          <li>
            <Link
              href="/dashboard/review/history"
              className="font-body text-sm font-medium text-primary hover:underline"
            >
              Past reviews
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground">·</span>
          </li>
          <li>
            <Link
              href="/dashboard/review/weekly"
              className="font-body text-sm font-medium text-primary hover:underline"
            >
              Rate & fix
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground">·</span>
          </li>
          <li>
            <Link
              href="/dashboard/scorecard"
              className="font-body text-sm font-medium text-primary hover:underline"
            >
              Map your day
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground">·</span>
          </li>
          <li>
            <Link
              href="/dashboard/review/reset"
              className="font-body text-sm font-medium text-primary hover:underline"
            >
              I&rsquo;m stuck — reset
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground">·</span>
          </li>
          <li>
            <Link
              href="/dashboard/review/monthly"
              className="font-body text-sm font-medium text-primary hover:underline"
            >
              Monthly reflection
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
