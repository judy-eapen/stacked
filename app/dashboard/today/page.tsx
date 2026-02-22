'use client'

import { useState, useEffect, useCallback } from 'react'

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
}

interface TodayData {
  date: string
  days_since_last_visit: number
  habits: TodayHabit[]
}

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [voteFeedback, setVoteFeedback] = useState<{ habitId: string; identity: string } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [dismissedWelcome, setDismissedWelcome] = useState(false)
  const [identityVoteSummary, setIdentityVoteSummary] = useState<Record<string, number> | null>(null)

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
              ? { ...h, completed_today: nextCompleted, current_streak: result.current_streak }
              : h
          ),
        }
      })
    }

    if (nextCompleted && result.identity) {
      setVoteFeedback({ habitId: habit.id, identity: result.identity })
      setTimeout(() => setVoteFeedback(null), 3000)
    }
    if (result.all_completed_today) {
      setShowCelebration(true)
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e87722] border-t-transparent" />
        <p className="text-sm text-gray-500 mt-3">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Today</h1>
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchToday().finally(() => setLoading(false)); }}
          className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  const showWelcome = data && data.days_since_last_visit >= 7 && !dismissedWelcome
  const habits = data?.habits ?? []
  const remaining = habits.filter((h) => !h.completed_today).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Today
        </h1>
        <p className="text-sm text-gray-500">
          {remaining === 0 && habits.length > 0
            ? 'All done for today.'
            : `${remaining} of ${habits.length} remaining.`}
        </p>
      </div>

      {showWelcome && (
        <div className="rounded-xl bg-white border border-[#e87722]/30 p-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-gray-900">Welcome back.</p>
            <p className="text-sm text-gray-600 mt-1">Here&rsquo;s where things stand. Check in today.</p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedWelcome(true)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {showCelebration && identityVoteSummary && (
        <div className="rounded-xl bg-[#e87722]/10 border border-[#e87722]/30 p-4 space-y-2">
          <p className="font-medium text-gray-900">All done for today!</p>
          <p className="text-sm text-gray-600">
            {Object.entries(identityVoteSummary)
              .filter(([, n]) => n > 0)
              .map(([identity, n]) => `${n} vote${n !== 1 ? 's' : ''} for "${identity}"`)
              .join('. ')}
          </p>
          <button
            type="button"
            onClick={() => { setShowCelebration(false); setIdentityVoteSummary(null); }}
            className="text-sm font-medium text-[#e87722] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-6 text-center">
          <p className="text-gray-600">You don&rsquo;t have any habits to track yet.</p>
          <p className="text-sm text-gray-500 mt-2">Add habits from Identities or Habits to see them here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {habits.map((h) => (
            <li key={h.id} className="rounded-xl bg-white border border-gray-200/80 p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(h)}
                  disabled={togglingId === h.id}
                  className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    h.completed_today
                      ? 'bg-[#e87722] border-[#e87722] text-white'
                      : 'border-gray-300 hover:border-[#e87722]/70'
                  }`}
                  aria-label={h.completed_today ? 'Mark incomplete' : 'Mark complete'}
                >
                  {h.completed_today ? '✓' : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${h.completed_today ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {h.name}
                  </p>
                  {h.two_minute_version && (
                    <p className="text-sm text-gray-600 mt-0.5">{h.two_minute_version}</p>
                  )}
                  {h.stack_context && (
                    <p className="text-xs text-gray-500 mt-1">{h.stack_context}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      Streak: {h.current_streak}
                      {h.total_completions > 0 && ` · ${h.total_completions} total`}
                    </span>
                  </div>
                  {h.consecutive_misses === 1 && !h.completed_today && (
                    <p className="text-sm text-amber-700 mt-2">
                      You missed yesterday. Do it today and your streak continues. Never miss twice.
                    </p>
                  )}
                  {h.consecutive_misses >= 2 && !h.completed_today && (
                    <p className="text-sm text-gray-600 mt-2">
                      Fresh start. Your history isn&rsquo;t gone — you&rsquo;ve completed this habit {h.total_completions} times total. Pick up where you left off.
                    </p>
                  )}
                  {voteFeedback?.habitId === h.id && voteFeedback?.identity && (
                    <p className="text-sm text-[#e87722] mt-2">1 vote for &ldquo;{voteFeedback.identity}&rdquo;</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
