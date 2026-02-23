'use client'

import { useState, useEffect, useCallback } from 'react'
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
              ? { ...h, completed_today: nextCompleted, current_streak: result.current_streak }
              : h
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e87722]/30 border-t-[#e87722]" />
        <p className="text-sm text-gray-500 mt-4 font-medium">Loading today…</p>
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

  const completedCount = habits.length - remaining

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Today
          </h1>
          {habits.length > 0 && (
            <p className="mt-2 text-lg font-semibold text-gray-700">
              {remaining === 0
                ? 'All done for today.'
                : (
                  <>
                    <span className="text-[#e87722]">{completedCount}</span>
                    <span className="text-gray-500 font-medium"> / {habits.length} </span>
                    <span className="text-gray-600">completed</span>
                  </>
                )}
            </p>
          )}
        </div>

        {habits.length > 0 && (
          <>
            {/* Segment progress bar */}
            <div className="flex gap-1.5" aria-hidden>
              {habits.map((h) => (
                <div
                  key={h.id}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    h.completed_today ? 'bg-[#e87722]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={shareCheckIn}
                className="text-sm font-medium text-[#e87722] hover:text-[#c45a0a] hover:underline transition-colors"
              >
                {shareCopied ? 'Copied' : 'Share check-in'}
              </button>
              <span className="text-xs text-gray-500">One miss doesn&rsquo;t reset your streak; two in a row do.</span>
            </div>
          </>
        )}
      </div>

      {habits.length > 0 && (
        <div className="rounded-2xl bg-white/90 border border-gray-200/80 shadow-sm p-4">
          <button
            type="button"
            onClick={() => { setShowPastDays((v) => !v); if (!showPastDays) setPastDaysDate(null); }}
            className="text-sm font-medium text-[#e87722] hover:text-[#c45a0a] hover:underline transition-colors"
          >
            {showPastDays ? 'Hide past days' : 'Edit past days'}
          </button>
          {showPastDays && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-600">Select a date (last 7 days) to mark habits complete or incomplete.</p>
              <div className="flex flex-wrap gap-2">
                {getLast7Days().map((d) => {
                  const label = (() => {
                    const dt = new Date(d + 'T12:00:00')
                    const today = new Date()
                    const diff = Math.floor((today.getTime() - dt.getTime()) / (24 * 60 * 60 * 1000))
                    if (diff === 1) return 'Yesterday'
                    if (diff <= 7) return `${diff} days ago`
                    return d
                  })()
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPastDaysDate(d)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        pastDaysDate === d
                          ? 'bg-[#e87722] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {pastDaysDate && (
                <div className="border-t border-gray-100 pt-3">
                  {pastDaysLoading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : pastDaysData ? (
                    <ul className="space-y-2">
                      {pastDaysData.habits.map((h) => (
                        <li key={h.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                          <span className="text-sm text-gray-900">{h.name}</span>
                          <button
                            type="button"
                            onClick={() => handlePastDayToggle(h, pastDaysDate)}
                            disabled={pastDaysTogglingId === h.id}
                            className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                              h.completed_today ? 'bg-[#e87722] border-[#e87722] text-white' : 'border-gray-300 hover:border-[#e87722]/70'
                            }`}
                            aria-label={h.completed_today ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {h.completed_today ? '✓' : null}
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

      {showWelcome && (
        <div className="rounded-2xl bg-white/95 border border-[#e87722]/30 shadow-sm p-5 flex items-start justify-between gap-3 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden>👋</span>
            <div>
              <p className="font-semibold text-gray-900">Welcome back.</p>
              <p className="text-sm text-gray-600 mt-0.5">Here&rsquo;s where things stand. Check in today.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedWelcome(true)}
            className="text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
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
        <div className="rounded-2xl bg-gradient-to-br from-[#e87722]/15 to-[#e87722]/5 border border-[#e87722]/30 shadow-md p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e87722] text-white text-2xl" aria-hidden>✓</span>
            <div>
              <p className="font-bold text-gray-900 text-lg">All done for today!</p>
              <p className="text-sm text-gray-600">You cast votes for your identities.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(identityVoteSummary)
              .filter(([, n]) => n > 0)
              .map(([identity, n]) => (
                <span
                  key={identity}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#e87722]/20 text-sm font-medium text-gray-800"
                >
                  <span className="text-[#e87722]">{n}×</span>
                  {identity}
                </span>
              ))}
          </div>
          {!sharePromptDismissed && (
            <div className="pt-4 border-t border-[#e87722]/20 space-y-3">
              <p className="text-sm font-medium text-gray-900">Share your check-in with your partner?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { shareCheckIn(); dismissSharePrompt(); }}
                  className="h-10 px-4 rounded-xl bg-[#e87722] text-white text-sm font-semibold hover:bg-[#d96b1e] transition-colors shadow-sm"
                >
                  {shareCopied ? 'Copied' : 'Copy summary'}
                </button>
                <button
                  type="button"
                  onClick={dismissSharePrompt}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setShowCelebration(false); setIdentityVoteSummary(null); }}
            className="text-sm font-medium text-[#e87722] hover:text-[#c45a0a] hover:underline transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="rounded-2xl bg-white/90 border border-gray-200 shadow-sm p-8 text-center">
          <span className="text-4xl block mb-3" aria-hidden>📋</span>
          <p className="font-medium text-gray-800">No habits to track yet.</p>
          <p className="text-sm text-gray-500 mt-1">Add habits from Identities or Habits to see them here.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {habits.map((h) => (
            <li
              key={h.id}
              className={`rounded-2xl bg-white/95 border shadow-sm p-4 transition-all duration-200 ${
                h.completed_today
                  ? 'border-[#e87722]/30 border-l-4 border-l-[#e87722]'
                  : 'border-gray-200/80 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => handleToggle(h)}
                  disabled={togglingId === h.id}
                  className={`mt-0.5 shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                    justCompletedId === h.id ? 'animate-check-pop ' : ''
                  }${
                    h.completed_today
                      ? 'bg-[#e87722] border-[#e87722] text-white'
                      : 'border-gray-300 hover:border-[#e87722] hover:bg-[#e87722]/10'
                  }`}
                  aria-label={h.completed_today ? 'Mark incomplete' : 'Mark complete'}
                >
                  {h.completed_today ? '✓' : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${h.completed_today ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {h.name}
                  </p>
                  {h.two_minute_version && (
                    <p className="text-sm text-gray-600 mt-0.5">{h.two_minute_version}</p>
                  )}
                  {h.stack_context && (
                    <p className="text-xs text-gray-500 mt-1">{h.stack_context}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.current_streak > 0
                          ? 'bg-[#e87722]/15 text-[#c45a0a]'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      title="Never miss twice: one miss doesn't reset; two consecutive misses reset to 0."
                    >
                      {h.current_streak > 0 && <span aria-hidden>🔥</span>}
                      {h.current_streak} day{h.current_streak !== 1 ? 's' : ''}
                      {h.total_completions > 0 && (
                        <span className="text-gray-400"> · {h.total_completions} total</span>
                      )}
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
                    <p className="text-sm font-medium text-[#e87722] mt-2">+1 vote for &ldquo;{voteFeedback.identity}&rdquo;</p>
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
