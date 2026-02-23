'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface HabitInfo {
  id: string
  name: string
  two_minute_version: string | null
  identity_id: string | null
  identities: { statement: string } | null
  current_streak: number
}

interface StreakData {
  habit_id: string
  habit_name: string
  current_streak: number
  completions: { date: string; completed: boolean }[]
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function HabitDetailPage() {
  const params = useParams()
  const habitId = params?.habitId as string
  const [habit, setHabit] = useState<HabitInfo | null>(null)
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHabit = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error: err } = await supabase
      .from('habits')
      .select('id, name, two_minute_version, identity_id, current_streak, identities(statement)')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single()
    if (err || !data) {
      setError(err?.message ?? 'Habit not found')
      setHabit(null)
      setLoading(false)
      return
    }
    const raw = data as HabitInfo & { identities: unknown }
    setHabit({
      id: raw.id,
      name: raw.name,
      two_minute_version: raw.two_minute_version,
      identity_id: raw.identity_id,
      identities: Array.isArray(raw.identities) ? raw.identities[0] ?? null : raw.identities,
      current_streak: raw.current_streak,
    })
    setError(null)
    setLoading(false)
  }, [habitId])

  const fetchStreak = useCallback(async () => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 29)
    const fromStr = toDateString(from)
    const toStr = toDateString(to)
    const res = await fetch(
      `/api/habits/${habitId}/streaks?from=${fromStr}&to=${toStr}`,
      { credentials: 'include' }
    )
    if (!res.ok) return
    const json = await res.json()
    setStreakData(json)
  }, [habitId])

  useEffect(() => {
    fetchHabit()
  }, [fetchHabit])

  useEffect(() => {
    if (habitId) fetchStreak()
  }, [habitId, fetchStreak])

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (error || !habit) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/habits" className="text-sm text-[#e87722] hover:underline">← Back to habits</Link>
        <p className="text-sm text-red-600" role="alert">{error ?? 'Not found'}</p>
      </div>
    )
  }

  const completedSet = new Set(
    streakData?.completions?.filter((c) => c.completed).map((c) => c.date) ?? []
  )
  const last30: string[] = []
  const d = new Date()
  for (let i = 29; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    last30.push(toDateString(x))
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/habits" className="text-sm text-[#e87722] hover:underline">← Back to habits</Link>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5 space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">{habit.name}</h1>
        {habit.identities?.statement && (
          <p className="text-sm text-gray-500">{habit.identities.statement}</p>
        )}
        {habit.two_minute_version && (
          <p className="text-sm text-gray-600">2-min: {habit.two_minute_version}</p>
        )}
        <p className="text-xs text-gray-500">Current streak: {habit.current_streak}</p>
      </div>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Last 30 days</h2>
        <p className="text-xs text-gray-500 mb-3">Completed days are filled; empty cells are missed or not scheduled.</p>
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            maxWidth: '280px',
          }}
        >
          {last30.map((dateStr) => {
            const completed = completedSet.has(dateStr)
            const isToday = dateStr === toDateString(new Date())
            return (
              <div
                key={dateStr}
                title={dateStr}
                className={`aspect-square rounded flex items-center justify-center text-[10px] ${
                  completed
                    ? 'bg-[#e87722] text-white'
                    : isToday
                      ? 'bg-gray-200 text-gray-600 ring-1 ring-[#e87722]'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {new Date(dateStr + 'T12:00:00').getDate()}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/dashboard/habits?identity=${habit.identity_id || ''}`}
          className="text-sm font-medium text-[#e87722] hover:underline"
        >
          Edit habit
        </Link>
        <Link
          href={`/dashboard/habits/${habitId}/contract`}
          className="text-sm font-medium text-gray-600 hover:text-[#e87722]"
        >
          Contract
        </Link>
      </div>
    </div>
  )
}
