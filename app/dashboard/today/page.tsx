'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns'
import { Share2, Check, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { GraduationPrompt } from '@/components/graduation-prompt'

interface TodayHabit {
  id: string
  name: string
  identity: string | null
  identity_id: string | null
  two_minute_version: string | null
  implementation_intention: { time?: string; location?: string; behavior?: string } | null
  stack_context: string | null
  temptation_bundle: string | null
  time_of_day: string
  completed_today: boolean
  current_streak: number
  consecutive_misses: number
  total_completions: number
  missed_yesterday: boolean
  week_completion?: boolean[]
}

interface TodayData {
  date: string
  days_since_last_visit: number
  habits: TodayHabit[]
}

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [voteFeedback, setVoteFeedback] = useState<{ habitId: string; identity: string } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [dismissedWelcome, setDismissedWelcome] = useState(false)
  const [identityVoteSummary, setIdentityVoteSummary] = useState<Record<string, number> | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [sharePromptDismissed, setSharePromptDismissed] = useState(false)
  const [showPastDays, setShowPastDays] = useState(false)
  const [pastDaysDate, setPastDaysDate] = useState<string | null>(null)
  const [pastDaysData, setPastDaysData] = useState<TodayData | null>(null)
  const [pastDaysLoading, setPastDaysLoading] = useState(false)
  const [pastDaysTogglingId, setPastDaysTogglingId] = useState<string | null>(null)
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)

  function getLast7Days(): string[] {
    const out: string[] = []
    const d = new Date()
    for (let i = 1; i <= 7; i++) {
      const x = new Date(d)
      x.setDate(d.getDate() - i)
      out.push(x.toISOString().slice(0, 10))
    }
    return out
  }

  const fetchPastDay = useCallback(async (dateStr: string) => {
    setPastDaysLoading(true)
    const res = await fetch(`/api/habits/today?date=${dateStr}`, { credentials: 'include' })
    setPastDaysLoading(false)
    if (!res.ok) {
      setPastDaysData(null)
      return
    }
    const json = await res.json()
    setPastDaysData(json)
  }, [])

  useEffect(() => {
    if (showPastDays && pastDaysDate) fetchPastDay(pastDaysDate)
    else setPastDaysData(null)
  }, [showPastDays, pastDaysDate, fetchPastDay])

  const handlePastDayToggle = async (habit: TodayHabit, selectedDate: string) => {
    if (pastDaysTogglingId) return
    const nextCompleted = !habit.completed_today
    setPastDaysTogglingId(habit.id)
    setPastDaysData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        habits: prev.habits.map((h) =>
          h.id === habit.id ? { ...h, completed_today: nextCompleted } : h
        ),
      }
    })
    const res = await fetch(`/api/habits/${habit.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date: selectedDate, completed: nextCompleted }),
    })
    setPastDaysTogglingId(null)
    if (!res.ok) {
      if (pastDaysDate) fetchPastDay(pastDaysDate)
      return
    }
    if (pastDaysDate) fetchPastDay(pastDaysDate)
    fetchToday()
  }

  const fetchToday = useCallback(async () => {
    const res = await fetch('/api/habits/today', { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error || res.statusText)
      setData(null)
      return
    }
    const json = await res.json()
    setData(json)
    setError(null)
  }, [])

  useEffect(() => {
    fetchToday().finally(() => setLoading(false))
  }, [fetchToday])

  useEffect(() => {
    const key = 'stacked_share_prompt_dismissed'
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const { date } = JSON.parse(raw)
        const today = new Date().toISOString().slice(0, 10)
        if (date === today) setSharePromptDismissed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const dismissSharePrompt = () => {
    setSharePromptDismissed(true)
    try {
      localStorage.setItem(
        'stacked_share_prompt_dismissed',
        JSON.stringify({ date: new Date().toISOString().slice(0, 10) })
      )
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!data) return
    const remaining = data.habits.filter((h) => !h.completed_today).length
    document.title = remaining > 0 ? `Stacked (${remaining} remaining)` : 'Stacked'
    return () => {
      document.title = 'Stacked'
    }
  }, [data])

  const handleToggle = async (habit: TodayHabit) => {
    if (togglingId) return
    const nextCompleted = !habit.completed_today
    setTogglingId(habit.id)
    setVoteFeedback(null)
    setIdentityVoteSummary(null)

    const prevCompleted = habit.completed_today
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        habits: prev.habits.map((h) =>
          h.id === habit.id ? { ...h, completed_today: nextCompleted } : h
        ),
      }
    })

    const res = await fetch(`/api/habits/${habit.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        date: data?.date ?? new Date().toISOString().slice(0, 10),
        completed: nextCompleted,
      }),
    })

    setTogglingId(null)
    if (!res.ok) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          habits: prev.habits.map((h) =>
            h.id === habit.id ? { ...h, completed_today: prevCompleted } : h
          ),
        }
      })
      const err = await res.json().catch(() => ({}))
      setError(err.error || 'Failed to update')
      return
    }

    const result = await res.json()
    if (result.current_streak !== undefined) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          habits: prev.habits.map((h) =>
            h.id === habit.id
              ? { ...h, completed_today: nextCompleted, current_streak: result.current_streak } : h
          ),
        }
      })
    }

    if (nextCompleted) {
      setJustCompletedId(habit.id)
      setTimeout(() => setJustCompletedId(null), 400)
    }
    if (nextCompleted && result.identity) {
      setVoteFeedback({ habitId: habit.id, identity: result.identity })
      setTimeout(() => setVoteFeedback(null), 3000)
    }
    if (result.all_completed_today) {
      setShowCelebration(true)
      setSharePromptDismissed(false)
      const summary: Record<string, number> = {}
      for (const h of data?.habits ?? []) {
        if (h.identity && (h.id === habit.id ? nextCompleted : h.completed_today)) {
          summary[h.identity] = (summary[h.identity] ?? 0) + 1
        }
      }
      if (habit.identity && nextCompleted) {
        summary[habit.identity] = (summary[habit.identity] ?? 0) + 1
      }
      setIdentityVoteSummary(summary)
    }
  }

  function shareCheckIn() {
    if (!data) return
    const completed = habits.filter((h) => h.completed_today)
    const lines: string[] = [
      `Stacked check-in · ${data.date}`,
      '',
      ...completed.map((h) => `✓ ${h.name} (streak ${h.current_streak})`),
    ]
    const voteSummary: Record<string, number> = identityVoteSummary ?? {}
    if (Object.keys(voteSummary).length === 0 && completed.length > 0) {
      for (const h of completed) {
        if (h.identity) voteSummary[h.identity] = (voteSummary[h.identity] ?? 0) + 1
      }
    }
    if (Object.keys(voteSummary).length > 0) {
      const votes = Object.entries(voteSummary)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => `${n} vote${n !== 1 ? 's' : ''} for "${id}"`)
      if (votes.length) lines.push('', votes.join('. '))
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (origin) lines.push('', origin)
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground mt-4 font-body">Loading today…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-background min-h-[50vh] p-4 space-y-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Today</h1>
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200 font-body" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchToday().finally(() => setLoading(false)); }}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium font-body"
        >
          Retry
        </button>
      </div>
    )
  }

  const showWelcome = data && data.days_since_last_visit >= 7 && !dismissedWelcome
  const habits = data?.habits ?? []
  const remaining = habits.filter((h) => !h.completed_today).length
  const completedCount = habits.length - remaining
  const todayDate = data?.date ? parseISO(data.date) : new Date()
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i))

  return (
    <div className="bg-background min-h-screen -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Today
            </h1>
            <p className="font-body text-base text-foreground mt-0.5">
              {format(todayDate, 'EEEE, MMMM d')}
            </p>
          </div>
          <button
            type="button"
            onClick={shareCheckIn}
            className="flex items-center gap-1.5 text-foreground hover:text-primary font-body text-sm font-medium shrink-0"
          >
            <Share2 className="w-4 h-4" />
            {shareCopied ? 'Copied' : 'Share'}
          </button>
        </div>
        {habits.length > 0 && (
          <>
            <p className="font-body text-foreground font-medium">
              {completedCount}/{habits.length} completed
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Never miss twice. One miss is fine, two breaks the streak.
            </p>
            <div className="flex gap-1 h-2 rounded-full bg-muted overflow-hidden">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    h.completed_today ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {completedCount} of {habits.length} completed
            </p>
          </>
        )}
      </div>

      {/* This Week */}
      {habits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
          <h2 className="font-heading font-semibold text-foreground mb-3">This Week</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDates.map((d, i) => {
              const completedThatDay = habits.filter((h) => h.week_completion?.[i]).length
              const isToday = isSameDay(d, todayDate)
              return (
                <div
                  key={d.toISOString()}
                  className={`shrink-0 flex flex-col items-center rounded-lg px-3 py-2 min-w-[56px] ${
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <span className="font-body text-xs font-semibold uppercase">
                    {format(d, 'EEE')}
                  </span>
                  <span className="font-heading text-lg font-bold">{format(d, 'd')}</span>
                  <div className="flex gap-0.5 mt-1.5">
                    {habits.map((_, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${
                          habits[j].week_completion?.[i]
                            ? isToday
                              ? 'bg-primary-foreground/80'
                              : 'bg-primary'
                            : 'bg-muted-foreground/30'
                        }`}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showWelcome && (
        <div className="rounded-2xl bg-card border border-primary/30 shadow-sm p-5 flex items-start justify-between gap-3 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden>👋</span>
            <div>
              <p className="font-heading font-semibold text-foreground">Welcome back.</p>
              <p className="font-body text-sm text-muted-foreground mt-0.5">
                Here&rsquo;s where things stand. Check in today.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedWelcome(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {remaining === 0 && habits.length > 0 && habits.some((h) => h.total_completions >= 21) && (
        <GraduationPrompt
          habits={habits.map((h) => ({ habit_id: h.id, habit_name: h.name, total_completions: h.total_completions }))}
        />
      )}

      {showCelebration && identityVoteSummary && (
        <div className="rounded-2xl bg-card border border-primary/30 shadow-md p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="w-6 h-6" />
            </span>
            <div>
              <p className="font-heading font-bold text-foreground text-lg">All done for today!</p>
              <p className="font-body text-sm text-muted-foreground">
                You cast votes for your identities.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(identityVoteSummary)
              .filter(([, n]) => n > 0)
              .map(([identity, n]) => (
                <span
                  key={identity}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium font-body border border-border"
                >
                  <span className="text-primary">{n}×</span>
                  {identity}
                </span>
              ))}
          </div>
          {!sharePromptDismissed && (
            <div className="pt-4 border-t border-border space-y-3">
              <p className="font-body text-sm font-medium text-foreground">
                Share your check-in with your partner?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { shareCheckIn(); dismissSharePrompt(); }}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold font-body shadow-sm hover:opacity-90 transition-opacity"
                >
                  {shareCopied ? 'Copied' : 'Copy summary'}
                </button>
                <button
                  type="button"
                  onClick={dismissSharePrompt}
                  className="h-10 px-4 rounded-lg border border-border text-sm font-medium font-body bg-card hover:bg-muted transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setShowCelebration(false); setIdentityVoteSummary(null); }}
            className="font-body text-sm font-medium text-primary hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Habit list */}
      {habits.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-8 text-center">
          <span className="text-4xl block mb-3" aria-hidden>📋</span>
          <p className="font-body font-medium text-foreground">No habits to track yet.</p>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Add habits from Identities or Habits to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className={`rounded-2xl bg-card border shadow-sm p-4 transition-all duration-200 hover:shadow-md ${
                h.completed_today
                  ? 'border-l-4 border-l-primary border-border'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(h)}
                  disabled={togglingId === h.id}
                  className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    justCompletedId === h.id ? 'animate-check-pop ' : ''
                  }${
                    h.completed_today
                      ? 'bg-primary text-primary-foreground'
                      : 'border-2 border-border hover:border-primary hover:bg-primary/10'
                  }`}
                  aria-label={h.completed_today ? 'Mark incomplete' : 'Mark complete'}
                >
                  {h.completed_today ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-heading font-semibold ${
                      h.completed_today ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {h.name}
                  </p>
                  {h.two_minute_version && (
                    <p className="font-body text-sm text-muted-foreground mt-0.5">
                      {h.two_minute_version}
                    </p>
                  )}
                  {h.stack_context && (
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{h.stack_context}</p>
                  )}
                  {h.consecutive_misses === 1 && !h.completed_today && (
                    <p className="font-body text-sm text-amber-700 mt-1.5">
                      You missed yesterday. Do it today and your streak continues.
                    </p>
                  )}
                  {voteFeedback?.habitId === h.id && voteFeedback?.identity && (
                    <p className="font-body text-sm font-medium text-primary mt-1">
                      +1 vote for &ldquo;{voteFeedback.identity}&rdquo;
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-body ${
                        h.current_streak > 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {h.current_streak > 0 && <Zap className="w-3 h-3" />}
                      {h.current_streak} day{h.current_streak !== 1 ? 's' : ''}
                    </span>
                    {h.total_completions > 0 && (
                      <span className="font-body text-xs text-muted-foreground">
                        {h.total_completions} total
                      </span>
                    )}
                  </div>
                  {/* Weekly dots */}
                  <div className="flex items-center gap-1 mt-2">
                    {WEEKDAY_LETTERS.map((letter, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <span className="font-body text-[10px] text-muted-foreground">{letter}</span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            h.week_completion?.[i] ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          {h.week_completion?.[i] ? (
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit past days */}
      {habits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
          <button
            type="button"
            onClick={() => { setShowPastDays((v) => !v); if (!showPastDays) setPastDaysDate(null); }}
            className="flex items-center justify-between w-full font-body text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Edit past days
            {showPastDays ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showPastDays && (
            <div className="mt-4 space-y-3">
              <p className="font-body text-xs text-muted-foreground">
                Select a date (last 7 days) to mark habits complete or incomplete.
              </p>
              <div className="flex flex-wrap gap-2">
                {getLast7Days().map((d) => {
                  const dt = new Date(d + 'T12:00:00')
                  const today = new Date()
                  const diff = Math.floor(
                    (today.getTime() - dt.getTime()) / (24 * 60 * 60 * 1000)
                  )
                  const label =
                    diff === 1 ? 'Yesterday' : diff <= 7 ? `${diff} days ago` : d
                  const isSelected = pastDaysDate === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPastDaysDate(d)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium font-body transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {pastDaysDate && (
                <div className="border-t border-border pt-3">
                  {pastDaysLoading ? (
                    <p className="font-body text-sm text-muted-foreground">Loading…</p>
                  ) : pastDaysData ? (
                    <ul className="space-y-2">
                      {pastDaysData.habits.map((habit) => (
                        <li
                          key={habit.id}
                          className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0"
                        >
                          <span className="font-body text-sm text-foreground">
                            {habit.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePastDayToggle(habit, pastDaysDate)}
                            disabled={pastDaysTogglingId === habit.id}
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              habit.completed_today
                                ? 'bg-primary text-primary-foreground'
                                : 'border-2 border-border hover:border-primary'
                            }`}
                            aria-label={
                              habit.completed_today ? 'Mark incomplete' : 'Mark complete'
                            }
                          >
                            {habit.completed_today ? (
                              <Check className="w-4 h-4" strokeWidth={3} />
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
