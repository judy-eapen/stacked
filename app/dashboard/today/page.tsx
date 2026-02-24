'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { parseISO, startOfWeek, addDays } from 'date-fns'
import { TodayContent } from './today-content'

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

type IdentityVoteSummary = Record<string, number>

export default function TodayPage() {
  const [data, setData] = useState(null as TodayData | null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null as string | null)
  const [togglingId, setTogglingId] = useState(null as string | null)
  const [voteFeedback, setVoteFeedback] = useState(null as { habitId: string; identity: string } | null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [dismissedWelcome, setDismissedWelcome] = useState(false)
  const [identityVoteSummary, setIdentityVoteSummary] = useState(null as IdentityVoteSummary | null)
  const [shareCopied, setShareCopied] = useState(false)
  const [sharePromptDismissed, setSharePromptDismissed] = useState(false)
  const [showPastDays, setShowPastDays] = useState(false)
  const [pastDaysDate, setPastDaysDate] = useState(null as string | null)
  const [pastDaysData, setPastDaysData] = useState(null as TodayData | null)
  const [pastDaysLoading, setPastDaysLoading] = useState(false)
  const [pastDaysTogglingId, setPastDaysTogglingId] = useState(null as string | null)
  const [justCompletedId, setJustCompletedId] = useState(null as string | null)

  function getLast7Days() {
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
    const now = new Date()
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const res = await fetch(`/api/habits/today?date=${localDateStr}`, { credentials: 'include' })
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
      const todayDate = parseISO(prev.date)
      const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
      const todayIndex = Math.round((todayDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
      return {
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habit.id) return h
          const current = h.week_completion ?? [false, false, false, false, false, false, false]
          const nextWeek = [...current]
          nextWeek[todayIndex] = nextCompleted
          return { ...h, completed_today: nextCompleted, week_completion: nextWeek }
        }),
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
        const todayDate = parseISO(prev.date)
        const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
        const todayIndex = Math.round((todayDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
        return {
          ...prev,
          habits: prev.habits.map((h) => {
            if (h.id !== habit.id) return h
            const current = h.week_completion ?? [false, false, false, false, false, false, false]
            const nextWeek = [...current]
            nextWeek[todayIndex] = prevCompleted
            return { ...h, completed_today: prevCompleted, week_completion: nextWeek }
          }),
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
      const summary: IdentityVoteSummary = {}
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

  const habits = data?.habits ?? []
  const remaining = habits.filter((h) => !h.completed_today).length
  const completedCount = habits.length - remaining
  const todayDate = data?.date ? parseISO(data.date) : new Date()
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i))
  const showWelcome = data && data.days_since_last_visit >= 7 && !dismissedWelcome

  function shareCheckIn() {
    if (!data) return
    const completed = habits.filter((h) => h.completed_today)
    const lines: string[] = [
      `Stacked check-in · ${data.date}`,
      '',
      ...completed.map((h) => `✓ ${h.name} (streak ${h.current_streak})`),
    ]
    const voteSummary: IdentityVoteSummary = identityVoteSummary ?? {}
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

  return (
    <TodayContent
      habits={habits}
      todayDate={todayDate}
      weekDates={weekDates}
      completedCount={completedCount}
      remaining={remaining}
      showWelcome={Boolean(showWelcome)}
      showCelebration={showCelebration}
      identityVoteSummary={identityVoteSummary}
      shareCopied={shareCopied}
      sharePromptDismissed={sharePromptDismissed}
      togglingId={togglingId}
      justCompletedId={justCompletedId}
      voteFeedback={voteFeedback}
      showPastDays={showPastDays}
      pastDaysDate={pastDaysDate}
      pastDaysData={pastDaysData}
      pastDaysLoading={pastDaysLoading}
      pastDaysTogglingId={pastDaysTogglingId}
      getLast7Days={getLast7Days}
      onShareCheckIn={shareCheckIn}
      onDismissSharePrompt={dismissSharePrompt}
      onDismissWelcome={() => setDismissedWelcome(true)}
      onDismissCelebration={() => {
        setShowCelebration(false)
        setIdentityVoteSummary(null)
      }}
      onToggle={handleToggle}
      onPastDayToggle={handlePastDayToggle}
      onTogglePastDays={() => {
        setShowPastDays((v) => !v)
        if (!showPastDays) setPastDaysDate(null)
      }}
      setPastDaysDate={setPastDaysDate}
      daysSinceLastVisit={data?.days_since_last_visit ?? 0}
    />
  )
}
