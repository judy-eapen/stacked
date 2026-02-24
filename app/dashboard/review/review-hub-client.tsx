'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function getWeekStart(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export function ReviewHubClient() {
  const [showWeeklyPrompt, setShowWeeklyPrompt] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const weekStart = getWeekStart(new Date())
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setChecking(false)
        return
      }
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('review_type', 'weekly')
        .eq('review_date', weekStart)
        .maybeSingle()
      setShowWeeklyPrompt(!data)
      setChecking(false)
    })
  }, [])

  return (
    <>
      {!checking && showWeeklyPrompt && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-body text-sm text-foreground">
            You haven&rsquo;t reviewed this week. Write a review to reflect on your habits.
          </p>
          <Link
            href="/dashboard/review/write"
            className="shrink-0 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Write a review
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-heading text-sm font-semibold text-foreground">Ways to use the scorecard</h2>
          <Link
            href="/dashboard/review/write"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Write a review
          </Link>
        </div>
        <ul className="space-y-3">
          <li>
            <Link
              href="/dashboard/review/write"
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="font-heading font-medium text-foreground">Weekly review</span>
              <span className="font-body block text-xs text-muted-foreground mt-0.5">Reflect on your week with habit data, wins & warnings, and a 4-prompt reflection.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/weekly"
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="font-heading font-medium text-foreground">Rate & fix</span>
              <span className="font-body block text-xs text-muted-foreground mt-0.5">Rate this week (= / −), see friction and advice, apply one fix.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/scorecard"
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="font-heading font-medium text-foreground">Map your day</span>
              <span className="font-body block text-xs text-muted-foreground mt-0.5">List habits and rate them + / − / = by time of day. Recalibrate when you need a reset.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/reset"
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="font-heading font-medium text-foreground">I&rsquo;m stuck — reset</span>
              <span className="font-body block text-xs text-muted-foreground mt-0.5">60 seconds: mini-scorecard, pick one habit, shrink it, restart.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/monthly"
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="font-heading font-medium text-foreground">Monthly identity reflection</span>
              <span className="font-body block text-xs text-muted-foreground mt-0.5">Are your habits still aligned with who you want to become?</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/history"
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="font-heading font-medium text-foreground">Review history</span>
              <span className="font-body block text-xs text-muted-foreground mt-0.5">Past weekly and monthly reviews.</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  )
}
