'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GraduationPrompt } from '@/components/graduation-prompt'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Target,
  BookOpen,
  Sprout,
  Settings,
} from 'lucide-react'

export function getWeekStart(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface SummaryHabit {
  habit_id: string
  habit_name: string
  identity: string | null
  completion_rate: number
  current_streak: number
  streak_change: number
  missed_two_plus: boolean
  total_completions?: number
  scheduled_days: number
  completed_count: number
  week_completion: boolean[]
}

export interface Summary {
  week_start: string
  date_range: { start: string; end: string }
  habits: SummaryHabit[]
  identity_votes: Record<string, number>
}

const NEEDS_ATTENTION_THRESHOLD = 4 / 7

export function habitNeedsAttention(h: SummaryHabit): boolean {
  if (h.scheduled_days === 0) return false
  const ratio = h.completed_count / h.scheduled_days
  return ratio < NEEDS_ATTENTION_THRESHOLD || h.missed_two_plus
}

export interface WeeklyReviewContentProps {
  /** Initial week start (YYYY-MM-DD Monday). */
  initialWeekStart: string
  /** Callback when user changes week (e.g. prev/next). Parent can sync URL. */
  onWeekStartChange?: (weekStart: string) => void
  /** Show "← Review" back link (e.g. on write page). */
  showBackLink?: boolean
  /** Show "Review a different week" link to /dashboard/review/write. */
  showCustomWeekLink?: boolean
  /** Page title (e.g. "Review" on main tab, "Weekly Review" on write). */
  title?: string
}

export function WeeklyReviewContent({
  initialWeekStart,
  onWeekStartChange,
  showBackLink = false,
  showCustomWeekLink = false,
  title = 'Review',
}: WeeklyReviewContentProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [wins, setWins] = useState('')
  const [struggles, setStruggles] = useState('')
  const [identityReflection, setIdentityReflection] = useState('')
  const [adjustments, setAdjustments] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setWeekStart(initialWeekStart)
  }, [initialWeekStart])

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/reviews/summary?period=weekly&date=${weekStart}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      setSummary(null)
      setError('Failed to load summary')
      return
    }
    const data = await res.json()
    setSummary(data)
    setError(null)
  }, [weekStart])

  const fetchExisting = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('reviews')
      .select('wins, struggles, identity_reflection, adjustments')
      .eq('user_id', user.id)
      .eq('review_type', 'weekly')
      .eq('review_date', weekStart)
      .single()
    if (data) {
      setWins(data.wins ?? '')
      setStruggles(data.struggles ?? '')
      setIdentityReflection(data.identity_reflection ?? '')
      setAdjustments(data.adjustments ?? '')
    }
  }, [weekStart])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSummary(), fetchExisting()]).finally(() => setLoading(false))
  }, [fetchSummary, fetchExisting])

  async function handleSave() {
    setError(null)
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const { error: err } = await supabase.from('reviews').upsert(
      {
        user_id: user.id,
        review_type: 'weekly',
        review_date: weekStart,
        wins: wins.trim() || null,
        struggles: struggles.trim() || null,
        identity_reflection: identityReflection.trim() || null,
        adjustments: adjustments.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,review_type,review_date' }
    )
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function goPrevWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    const next = getWeekStart(d)
    setWeekStart(next)
    onWeekStartChange?.(next)
  }

  function goNextWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    const next = getWeekStart(d)
    setWeekStart(next)
    onWeekStartChange?.(next)
  }

  const todayWeekStart = getWeekStart(new Date())
  const canGoNext = weekStart < todayWeekStart

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {showBackLink && (
            <Link
              href="/dashboard/review"
              className="font-body text-sm text-muted-foreground hover:text-foreground inline-block mb-1"
            >
              ← Review
            </Link>
          )}
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-0.5">
            {summary?.date_range
              ? formatDateRange(summary.date_range.start, summary.date_range.end)
              : `Week of ${weekStart}`}
          </p>
          {showCustomWeekLink && (
            <Link
              href="/dashboard/review/write"
              className="font-body text-sm text-primary hover:underline mt-1 inline-block"
            >
              Review a different week
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevWeek}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted/50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-body text-sm font-medium text-muted-foreground min-w-[4rem] text-center">
            Week
          </span>
          <button
            type="button"
            onClick={goNextWeek}
            disabled={!canGoNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <p
          className="font-body text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      {summary && summary.habits.length === 0 && (
        <p className="font-body text-sm text-muted-foreground">
          No habits to show. Add habits and complete them to see data here.
        </p>
      )}

      {summary && summary.habits.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-sm font-semibold text-foreground mb-2">
                Habit scoreboard
              </h2>
              <p className="font-body text-xs text-muted-foreground mb-3">
                Sorted by completion. Every check is a vote for your identity.
              </p>
              <ul className="space-y-3">
                {summary.habits.map((h) => {
                  const needsAttention = habitNeedsAttention(h)
                  return (
                    <li key={h.habit_id}>
                      <Link
                        href={`/dashboard/habits/${h.habit_id}`}
                        className={`block rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:shadow-md ${
                          needsAttention
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 font-body text-xs mb-1">
                              {DAY_LABELS.map((label, i) => (
                                <span
                                  key={label}
                                  className={
                                    h.week_completion[i]
                                      ? 'font-medium text-primary'
                                      : 'text-muted-foreground/70'
                                  }
                                  aria-label={`${label} ${h.week_completion[i] ? 'completed' : 'not completed'}`}
                                >
                                  {label.charAt(0)}
                                </span>
                              ))}
                            </div>
                            <p className="font-heading font-medium text-foreground">
                              {h.habit_name}
                            </p>
                            {h.identity && (
                              <p className="font-body text-xs text-muted-foreground mt-0.5">
                                {h.identity}
                              </p>
                            )}
                          </div>
                          <div
                            className={`flex shrink-0 items-center gap-0.5 font-body text-sm ${
                              needsAttention ? 'text-red-600' : 'text-foreground'
                            }`}
                          >
                            <span className="text-muted-foreground">
                              {h.current_streak}
                            </span>
                            <span>
                              {h.completed_count}/{h.scheduled_days}
                            </span>
                            <ChevronRight
                              className={`h-4 w-4 ${needsAttention ? 'text-red-600' : 'text-primary'}`}
                            />
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-heading text-base font-semibold text-foreground mb-1">
                Weekly reflection
              </h2>
              <p className="font-body text-xs text-muted-foreground italic mb-4">
                &ldquo;Does this behavior help me become the type of person I wish to
                be?&rdquo; — James Clear
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="wins"
                    className="font-body flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"
                  >
                    <Sprout className="h-3.5 w-3.5 text-green-600" />
                    What went well this week?
                  </label>
                  <textarea
                    id="wins"
                    rows={2}
                    value={wins}
                    onChange={(e) => setWins(e.target.value)}
                    placeholder="Habits I showed up for, moments I'm proud of…"
                    className="font-body w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="struggles"
                    className="font-body flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"
                  >
                    <Settings className="h-3.5 w-3.5 text-orange-500" />
                    What could improve?
                  </label>
                  <textarea
                    id="struggles"
                    rows={2}
                    value={struggles}
                    onChange={(e) => setStruggles(e.target.value)}
                    placeholder="Patterns I noticed, obstacles…"
                    className="font-body w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="identity_reflection"
                    className="font-body flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                    Key lesson learned
                  </label>
                  <textarea
                    id="identity_reflection"
                    rows={2}
                    value={identityReflection}
                    onChange={(e) => setIdentityReflection(e.target.value)}
                    placeholder="What I learned about my habits or identity…"
                    className="font-body w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adjustments"
                    className="font-body flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"
                  >
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Next week focus
                  </label>
                  <textarea
                    id="adjustments"
                    rows={2}
                    value={adjustments}
                    onChange={(e) => setAdjustments(e.target.value)}
                    placeholder="One thing to prioritize or adjust…"
                    className="font-body w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-body text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save review'}
                </button>
                {saved && (
                  <span className="font-body text-sm font-medium text-green-600">Saved</span>
                )}
              </div>
              <GraduationPrompt
                habits={summary.habits}
                className="mt-4 pt-4 border-t border-border"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-heading text-sm font-semibold text-foreground mb-2">
                Wins & warnings
              </h2>
              <p className="font-body text-xs text-muted-foreground mb-3">
                Quick summary from the Atomic Habits playbook.
              </p>
              <div className="space-y-2">
                {summary.habits
                  .filter((h) => !habitNeedsAttention(h))
                  .map((h) => (
                    <p
                      key={h.habit_id}
                      className="font-body flex items-center gap-2 text-sm text-green-700"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      {h.habit_name} ({h.completed_count}/{h.scheduled_days})
                    </p>
                  ))}
                {summary.habits.filter(habitNeedsAttention).length > 0 && (
                  <>
                    <p className="font-body mt-3 flex items-center gap-2 text-xs font-medium text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Needs attention
                    </p>
                    {summary.habits
                      .filter(habitNeedsAttention)
                      .map((h) => (
                        <p
                          key={h.habit_id}
                          className="font-body flex items-center gap-2 text-sm text-red-600"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          {h.habit_name} ({h.completed_count}/{h.scheduled_days})
                        </p>
                      ))}
                  </>
                )}
              </div>
              <p className="font-body mt-3 text-xs text-muted-foreground">
                Never miss twice. Can you shrink these to a 2-minute version next week?
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-heading flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Atomic Habits insight
              </h2>
              <p className="font-body text-sm italic text-foreground mb-2">
                &ldquo;You do not rise to the level of your goals. You fall to the level
                of your systems.&rdquo;
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Review your 4 Laws design for any habit scoring below 4/7.
              </p>
            </div>

            {Object.keys(summary.identity_votes).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-heading text-sm font-semibold text-foreground mb-2">
                  Identity votes
                </h2>
                <p className="font-body text-xs text-muted-foreground mb-2">
                  Every habit completion is a vote for who you want to become.
                </p>
                <ul className="space-y-1">
                  {Object.entries(summary.identity_votes).map(([statement, count]) => (
                    <li key={statement} className="font-body text-sm text-foreground">
                      <span className="font-medium">{count} votes</span> {statement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {!summary && !loading && (
        <p className="font-body text-sm text-muted-foreground">
          Could not load summary. Check the week date and try again.
        </p>
      )}
    </div>
  )
}
