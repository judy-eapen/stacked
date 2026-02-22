'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getWeekStart(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

interface SummaryHabit {
  habit_id: string
  habit_name: string
  identity: string | null
  completion_rate: number
  current_streak: number
  streak_change: number
  missed_two_plus: boolean
  total_completions?: number
}

interface Summary {
  week_start: string
  date_range: { start: string; end: string }
  habits: SummaryHabit[]
  identity_votes: Record<string, number>
}

export default function WriteReviewPage() {
  const searchParams = useSearchParams()
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart(new Date()))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [existing, setExisting] = useState<{ wins: string; struggles: string; identity_reflection: string; adjustments: string } | null>(null)
  const [wins, setWins] = useState('')
  const [struggles, setStruggles] = useState('')
  const [identityReflection, setIdentityReflection] = useState('')
  const [adjustments, setAdjustments] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const date = searchParams.get('date')
    if (date) setWeekStart(date.slice(0, 10))
  }, [searchParams])

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/reviews/summary?period=weekly&date=${weekStart}`, { credentials: 'include' })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('reviews')
      .select('wins, struggles, identity_reflection, adjustments')
      .eq('user_id', user.id)
      .eq('review_type', 'weekly')
      .eq('review_date', weekStart)
      .single()
    if (data) {
      setExisting(data as { wins: string; struggles: string; identity_reflection: string; adjustments: string })
      setWins(data.wins ?? '')
      setStruggles(data.struggles ?? '')
      setIdentityReflection(data.identity_reflection ?? '')
      setAdjustments(data.adjustments ?? '')
    } else {
      setExisting(null)
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
    const { data: { user } } = await supabase.auth.getUser()
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

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/review" className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
          ← Review
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Write a review</h1>
        <p className="text-sm text-gray-500">
          Week of {summary?.date_range?.start ?? weekStart}. Use the data below to reflect.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <>
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">This week at a glance</h2>
            {summary.habits.length === 0 ? (
              <p className="text-sm text-gray-500">No habits to show. Add habits and complete them to see data here.</p>
            ) : (
              <ul className="space-y-2">
                {summary.habits.map((h) => (
                  <li key={h.habit_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-gray-900">{h.habit_name}</span>
                    <span className="text-gray-600">
                      {(h.completion_rate * 100).toFixed(0)}% · streak {h.current_streak}
                      {h.streak_change !== 0 && (
                        <span className={h.streak_change > 0 ? 'text-green-600' : 'text-amber-600'}>
                          {' '}({h.streak_change > 0 ? '+' : ''}{h.streak_change})
                        </span>
                      )}
                    </span>
                    {h.missed_two_plus && (
                      <span className="text-xs text-amber-700 font-medium">Needs attention</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {Object.keys(summary.identity_votes).length > 0 && (
              <p className="text-sm text-gray-600 mt-3">
                Identity votes: {Object.entries(summary.identity_votes).map(([id, n]) => `${n} for "${id}"`).join('; ')}
              </p>
            )}
            {summary.habits.some((h) => (h.total_completions ?? 0) >= 21) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900">Ready to level up?</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  You&rsquo;ve completed these habits 21+ times. Consider expanding beyond the 2-minute version.
                </p>
                <ul className="mt-1 text-sm text-gray-700 list-disc list-inside">
                  {summary.habits.filter((h) => (h.total_completions ?? 0) >= 21).map((h) => (
                    <li key={h.habit_id}>{h.habit_name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Reflection</h2>
            <div>
              <label htmlFor="wins" className="block text-sm font-medium text-gray-700 mb-1">Wins</label>
              <textarea
                id="wins"
                rows={2}
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="What went well?"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
              />
            </div>
            <div>
              <label htmlFor="struggles" className="block text-sm font-medium text-gray-700 mb-1">Struggles</label>
              <textarea
                id="struggles"
                rows={2}
                value={struggles}
                onChange={(e) => setStruggles(e.target.value)}
                placeholder="What was hard?"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
              />
            </div>
            <div>
              <label htmlFor="adjustments" className="block text-sm font-medium text-gray-700 mb-1">Adjustments</label>
              <textarea
                id="adjustments"
                rows={2}
                value={adjustments}
                onChange={(e) => setAdjustments(e.target.value)}
                placeholder="What will you change?"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save review'}
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
            </div>
          </div>
        </>
      )}

      {!summary && !loading && (
        <p className="text-sm text-gray-500">Could not load summary. Check the week date and try again.</p>
      )}
    </div>
  )
}
