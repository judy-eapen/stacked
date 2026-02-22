'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const FRICTION_OPTIONS = ['Forgot', 'Too tired', 'Too busy', 'Phone', 'Boring', 'Hard'] as const
type Friction = (typeof FRICTION_OPTIONS)[number]

const AUTO_ADVICE: Record<string, string> = {
  Forgot: 'Add cue',
  'Too tired': 'Shrink habit',
  'Too busy': 'Move time',
  Phone: 'Add cue',
  Boring: 'Add reward',
  Hard: 'Shrink habit',
}

function getWeekStart(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

interface Habit {
  id: string
  name: string
  two_minute_version: string | null
}

interface WeeklyRating {
  habit_id: string
  rating: '=' | '-'
  friction: string | null
}

export default function WeeklyReviewPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [ratings, setRatings] = useState<Record<string, '=' | '-'>>({})
  const [frictions, setFrictions] = useState<Record<string, Friction>>({})
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [applyFixHabitId, setApplyFixHabitId] = useState<string | null>(null)
  const [appliedAt, setAppliedAt] = useState<Record<string, boolean>>({})

  const weekStart = getWeekStart(new Date())

  const fetchHabitsAndRatings = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [habitsRes, ratingsRes] = await Promise.all([
      supabase
        .from('habits')
        .select('id, name, two_minute_version')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('weekly_review_ratings')
        .select('habit_id, rating, friction, advice_applied_at')
        .eq('user_id', user.id)
        .eq('week_start', weekStart),
    ])
    if (habitsRes.error) {
      setError(habitsRes.error.message)
      setHabits([])
    } else {
      setHabits((habitsRes.data ?? []) as Habit[])
      const initialRatings: Record<string, '=' | '-'> = {}
      const initialFrictions: Record<string, Friction> = {}
      const initialApplied: Record<string, boolean> = {}
      ;(ratingsRes.data ?? []).forEach((r: { habit_id: string; rating: string; friction: string | null; advice_applied_at: string | null }) => {
        initialRatings[r.habit_id] = r.rating as '=' | '-'
        if (r.friction && FRICTION_OPTIONS.includes(r.friction as Friction)) initialFrictions[r.habit_id] = r.friction as Friction
        if (r.advice_applied_at) initialApplied[r.habit_id] = true
      })
      setRatings(initialRatings)
      setFrictions(initialFrictions)
      setAppliedAt(initialApplied)
    }
    setError(null)
  }, [weekStart])

  useEffect(() => {
    fetchHabitsAndRatings().finally(() => setLoading(false))
  }, [fetchHabitsAndRatings])

  const minusHabits = habits.filter((h) => ratings[h.id] === '-')
  const canAdvanceStep1 = habits.length > 0 && habits.every((h) => ratings[h.id] === '=' || ratings[h.id] === '-')
  const canAdvanceStep2 = minusHabits.length === 0 || minusHabits.every((h) => frictions[h.id])

  const upsertRating = async (habitId: string, rating: '=' | '-', friction?: string | null) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from('weekly_review_ratings').upsert(
      {
        user_id: user.id,
        habit_id: habitId,
        week_start: weekStart,
        rating,
        friction: friction ?? null,
      },
      { onConflict: 'user_id,habit_id,week_start' }
    )
    if (err) setError(err.message)
  }

  const handleApplyFix = async (habitId: string, yes: boolean) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    if (yes) {
      await supabase
        .from('weekly_review_ratings')
        .update({ advice_applied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('habit_id', habitId)
        .eq('week_start', weekStart)
    }
    setAppliedAt((prev) => ({ ...prev, [habitId]: yes }))
    setApplyFixHabitId(null)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Weekly review</h1>
          <p className="text-sm text-gray-500">Rate this week: = or − per habit.</p>
        </div>
        <p className="text-sm text-gray-500">You have no active habits. Add habits first, then return here for your weekly review.</p>
        <Link href="/dashboard/habits" className="text-sm font-medium text-[#e87722] hover:underline">
          Go to Habits →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/review" className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
          ← Review
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Weekly review</h1>
        <p className="text-sm text-gray-500">
          {step === 1 && 'This week: tap = (kept up) or − (struggled) for each habit.'}
          {step === 2 && 'What got in the way for the habits you marked −?'}
          {step === 3 && 'We suggest one fix per 4 Laws. Apply the one that fits.'}
          {step === 4 && 'One-tap apply: change to 2-minute version, or later.'}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {step === 1 && (
        <>
          <div className="space-y-3">
            {habits.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3">
                <span className="text-sm font-medium text-gray-900">{h.name}</span>
                <div className="flex gap-1">
                  {(['=', '-'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={async () => {
                        setRatings((prev) => ({ ...prev, [h.id]: r }))
                        await upsertRating(h.id, r)
                      }}
                      className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg text-sm font-medium ${
                        ratings[h.id] === r ? 'bg-[#e87722] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/review" className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 inline-flex items-center">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canAdvanceStep1}
              className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-4">
            {minusHabits.map((h) => (
              <div key={h.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">What got in the way? — {h.name}</p>
                <div className="flex flex-wrap gap-2">
                  {FRICTION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={async () => {
                        setFrictions((prev) => ({ ...prev, [h.id]: opt }))
                        await upsertRating(h.id, '-', opt)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        frictions[h.id] === opt ? 'bg-[#e87722] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {minusHabits.length === 0 && (
              <p className="text-sm text-gray-500">No − habits this week. You can finish or go back to change a rating.</p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canAdvanceStep2}
              className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2 bg-gray-50 border-b border-gray-200">
              System maps to 4 Laws
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 font-medium text-gray-700">Issue</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700">Suggestion</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-2 px-4 text-gray-700">Forgot</td><td className="py-2 px-4">Add cue</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 px-4 text-gray-700">Hard</td><td className="py-2 px-4">Shrink habit</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 px-4 text-gray-700">Boring</td><td className="py-2 px-4">Add reward</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 px-4 text-gray-700">Busy</td><td className="py-2 px-4">Move time</td></tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            {minusHabits.map((h) => {
              const friction = frictions[h.id]
              const suggestion = friction ? AUTO_ADVICE[friction] ?? 'Shrink habit' : 'Shrink habit'
              return (
                <div key={h.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {friction ? `${friction} → ${suggestion}` : 'Suggest: shrink habit or add cue'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="mt-2 text-sm font-medium text-[#e87722] hover:underline"
                  >
                    Apply fix →
                  </button>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
              Back
            </button>
            <button type="button" onClick={() => setStep(4)} className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium">
              {minusHabits.length > 0 ? 'Apply fix' : 'Done'}
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          {minusHabits.length > 0 ? (
            <div className="space-y-4">
              {minusHabits.map((h) => (
                <div key={h.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Change to 2-minute version? — {h.name}</p>
                  {appliedAt[h.id] ? (
                    <p className="text-sm text-green-600">Applied.</p>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleApplyFix(h.id, true)}
                        className="h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleApplyFix(h.id, false)}
                        className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                      >
                        Later
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Link href="/dashboard/review" className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium inline-flex items-center">
              Done
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
