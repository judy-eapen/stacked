'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScorecardRating, TimeOfDay } from '@/lib/db-types'

type Rating = ScorecardRating
interface ScorecardEntry {
  id: string
  habit_name: string
  rating: Rating
  time_of_day: TimeOfDay
  sort_order: number
  identity_name?: string
  identity_votes?: number
  conflict_identity?: string
}

function mapRow(row: { id: string; habit_name: string; rating: string; time_of_day: string | null; sort_order: number }): ScorecardEntry {
  return {
    id: row.id,
    habit_name: row.habit_name,
    rating: row.rating as Rating,
    time_of_day: (row.time_of_day as TimeOfDay) ?? 'anytime',
    sort_order: row.sort_order,
  }
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
}

function Summary({ entries }: { entries: ScorecardEntry[] }) {
  const pos = entries.filter((e) => e.rating === '+').length
  const neg = entries.filter((e) => e.rating === '-').length
  const neu = entries.filter((e) => e.rating === '=').length
  const total = entries.length
  const net = pos - neg

  const insight =
    net > 0
      ? "You're building momentum."
      : net < 0
        ? "Focus on one habit to turn it around."
        : "One more positive habit will tip the scale."

  const netLabel = net > 0 ? `+${net}` : String(net)

  return (
    <div className="rounded-xl bg-white border border-gray-200/80 p-5 mb-6">
      <p className="text-sm font-medium text-gray-500 mb-1">Net score: {netLabel}</p>
      <p className="text-sm font-medium text-gray-700 mb-4">{insight}</p>
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
        <span><strong className="text-green-600">+{pos}</strong> positive</span>
        <span><strong className="text-red-600">−{neg}</strong> negative</span>
        <span><strong className="text-gray-500">={neu}</strong> neutral</span>
      </div>
    </div>
  )
}

function TakeActionCallout({ entries }: { entries: ScorecardEntry[] }) {
  const negative = entries.filter((e) => e.rating === '-')
  if (entries.length < 3 || negative.length === 0) return null

  // Highest-friction time of day: which has the highest share of negative habits?
  const times: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime']
  let frictionTime: TimeOfDay = times[0]
  let maxNegPct = 0
  for (const time of times) {
    const group = entries.filter((e) => e.time_of_day === time)
    const total = group.length
    if (total === 0) continue
    const negCount = group.filter((e) => e.rating === '-').length
    const negPct = (negCount / total) * 100
    if (negPct > maxNegPct) {
      maxNegPct = negPct
      frictionTime = time
    }
  }

  const negativeInBlock = negative.filter((e) => e.time_of_day === frictionTime)
  const focusHabit = negativeInBlock[0]
  if (!focusHabit) return null

  const timeLabel = TIME_LABELS[frictionTime]
  const pctLabel = `${Math.round(maxNegPct)}% negative`

  return (
    <div className="rounded-xl border-2 border-[#e87722]/50 bg-[#e87722]/[0.07] p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#e87722] bg-[#e87722]/10 px-2 py-0.5 rounded">
          Insight
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-1">Take action</p>
      <p className="text-sm text-gray-700 mb-3">
        {timeLabel} ({pctLabel}) is your highest-friction time of day.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
        <span className="text-gray-800">
          Replace &ldquo;{focusHabit.habit_name}&rdquo; with a 5-minute walk.
        </span>
        <button
          type="button"
          className="text-[#e87722] font-medium hover:underline shrink-0"
        >
          Work on this
        </button>
      </div>
    </div>
  )
}

function PatternByTime({ entries }: { entries: ScorecardEntry[] }) {
  const times: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime']
  const rows = times.map((time) => {
    const group = entries.filter((e) => e.time_of_day === time)
    const total = group.length
    const pos = group.filter((e) => e.rating === '+').length
    const neg = group.filter((e) => e.rating === '-').length
    const neu = group.filter((e) => e.rating === '=').length
    const negPct = total ? (neg / total) * 100 : 0

    let label: string
    if (total === 0) label = '—'
    else if (pos > neg && pos >= neu) label = `${Math.round((pos / total) * 100)}% positive`
    else if (neg > pos && neg >= neu) label = `${Math.round((neg / total) * 100)}% negative`
    else label = 'Neutral'

    return { time, label, total, negPct }
  })

  const worstTime = rows.filter((r) => r.negPct > 0).length
    ? rows.reduce((a, b) => (b.negPct > a.negPct ? b : a)).time
    : null

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white/80 p-4 mb-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        By time of day
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {rows.map(({ time, label, total }) => {
          const isWorst = worstTime === time && total > 0
          return (
            <div
              key={time}
              className={`flex flex-col rounded-lg p-3 transition-colors ${
                isWorst ? 'bg-red-50/90 border border-red-200/70' : ''
              }`}
            >
              <span className={`font-medium ${isWorst ? 'text-red-800/90' : 'text-gray-500'}`}>
                {TIME_LABELS[time]}
              </span>
              <span className={total === 0 ? 'text-gray-400' : isWorst ? 'text-red-900 font-semibold' : 'text-gray-900 font-medium'}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DEFAULT_ADD_RATING: Rating = '='
const DEFAULT_ADD_TIME: TimeOfDay = 'anytime'

export default function ScorecardPage() {
  const [entries, setEntries] = useState<ScorecardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEmpty, setShowEmpty] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showFocusStep, setShowFocusStep] = useState(false)
  const [focusHabitId, setFocusHabitId] = useState<string | null>(null)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitRating, setNewHabitRating] = useState<Rating>(DEFAULT_ADD_RATING)
  const [newHabitTime, setNewHabitTime] = useState<TimeOfDay>(DEFAULT_ADD_TIME)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error: err } = await supabase
      .from('scorecard_entries')
      .select('id, habit_name, rating, time_of_day, sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
      setEntries([])
      return
    }
    const list = (data ?? []).map(mapRow)
    setEntries(list)
    if (list.length === 0) setShowEmpty(true)
    setError(null)
  }, [])

  useEffect(() => {
    fetchEntries().finally(() => setLoading(false))
  }, [fetchEntries])

  const grouped = (time: TimeOfDay) =>
    entries.filter((e) => e.time_of_day === time).sort((a, b) => a.sort_order - b.sort_order)

  const setRating = async (entryId: string, rating: Rating) => {
    setSavingId(entryId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase
      .from('scorecard_entries')
      .update({ rating })
      .eq('id', entryId)
      .eq('user_id', user.id)
    setSavingId(null)
    if (err) {
      setError(err.message)
      return
    }
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, rating } : e)))
  }

  const hasEntries = entries.length > 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Habit Scorecard</h1>
          <p className="text-sm text-gray-500">List your current habits. Rate each one: positive (+), negative (-), or neutral (=).</p>
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Concept explainer */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Habit Scorecard
        </h1>
        <p className="text-sm text-gray-500">
          List your current habits. Rate each one: positive (+), negative (-), or neutral (=).
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {(hasEntries || !showEmpty) ? (
        <>
          <Summary entries={entries} />
          <TakeActionCallout entries={entries} />
          <div className="rounded-xl border-2 border-[#e87722]/30 bg-white overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => setShowFocusStep((v) => !v)}
              className="flex items-center justify-between gap-2 w-full text-left p-4 group"
            >
              <span className="text-sm font-semibold text-gray-900">
                Commit to one habit this week
              </span>
              <span
                className={`text-[#e87722] transition-transform ${showFocusStep ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}
                aria-hidden
              >
                →
              </span>
            </button>
            {showFocusStep && (
              <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-900 mb-3">Select one habit to improve.</p>
                {(() => {
                  const positiveEntries = entries.filter((e) => e.rating === '+')
                  if (positiveEntries.length === 0) {
                    return (
                      <p className="text-sm text-gray-500">
                        Add and rate habits as positive (+) to choose one to focus on this week.
                      </p>
                    )
                  }
                  return (
                    <ul className="space-y-1.5">
                      {positiveEntries.map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            onClick={() => setFocusHabitId(focusHabitId === entry.id ? null : entry.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              focusHabitId === entry.id
                                ? 'bg-[#e87722] text-white font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {entry.habit_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            )}
          </div>
          <PatternByTime entries={entries} />

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">Your habits by time of day</p>
            <button
              type="button"
              onClick={() => {
                setShowAddForm((v) => !v)
                if (!showAddForm) {
                  setNewHabitName('')
                  setNewHabitRating(DEFAULT_ADD_RATING)
                  setNewHabitTime(DEFAULT_ADD_TIME)
                }
              }}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              + Add habit
            </button>
          </div>

          {showAddForm && (
            <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">New habit</p>
              <input
                type="text"
                placeholder="e.g. Drink water after waking"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
              />
              <div className="flex flex-wrap gap-3">
                <span className="text-xs text-gray-500">Rating:</span>
                {(['+', '-', '='] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewHabitRating(r)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 ${
                      newHabitRating === r ? 'border-[#e87722] bg-[#e87722]/10 text-[#e87722]' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <span className="text-xs text-gray-500 ml-2">Time:</span>
                <select
                  value={newHabitTime}
                  onChange={(e) => setNewHabitTime(e.target.value as TimeOfDay)}
                  className="h-9 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="anytime">Anytime</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const name = newHabitName.trim().slice(0, 200)
                    if (!name) return
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const { error: err } = await supabase.from('scorecard_entries').insert({
                      user_id: user.id,
                      habit_name: name,
                      rating: newHabitRating,
                      time_of_day: newHabitTime,
                      sort_order: entries.length,
                    })
                    if (err) {
                      setError(err.message)
                      return
                    }
                    setShowAddForm(false)
                    fetchEntries()
                  }}
                  className="h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(['morning', 'afternoon', 'evening', 'anytime'] as const).map((time) => {
            const list = grouped(time)
            if (list.length === 0) return null
            return (
              <div key={time} className="rounded-xl bg-white border border-gray-200/80 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200/80">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {TIME_LABELS[time]}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {list.map((entry) => (
                    <li
                      key={entry.id}
                      className="group flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-900 block">{entry.habit_name}</span>
                        {entry.rating === '+' && entry.identity_name != null && (
                          <span className="text-xs text-gray-500 mt-0.5 block">
                            Votes for: &ldquo;{entry.identity_name}&rdquo;{entry.identity_votes != null ? ` (${entry.identity_votes})` : ''}
                          </span>
                        )}
                        {entry.rating === '-' && entry.conflict_identity != null && (
                          <span className="text-xs text-gray-500 mt-0.5 block">
                            Conflicts with: &ldquo;{entry.conflict_identity}&rdquo;
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="inline-flex rounded-lg border border-gray-200/60 bg-gray-100/40 p-0.5"
                          role="group"
                          aria-label="Rate habit"
                        >
                          {(['+', '-', '='] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRating(entry.id, r)}
                              disabled={savingId === entry.id}
                              className={`min-w-[2rem] px-2 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 disabled:opacity-60 ${
                                entry.rating === r
                                  ? 'bg-[#e87722] text-white shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 transition-colors"
                            aria-label="Edit or delete"
                            aria-expanded={openMenuId === entry.id}
                          >
                            <span className="sr-only">Edit or delete</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                          {openMenuId === entry.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                aria-hidden
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 bottom-full mb-0.5 z-20 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => { setEditingId(entry.id); setOpenMenuId(null); }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  onClick={async () => {
                                    const supabase = createClient()
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (!user) return
                                    await supabase.from('scorecard_entries').delete().eq('id', entry.id).eq('user_id', user.id)
                                    setOpenMenuId(null)
                                    fetchEntries()
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </>
      ) : (
        /* Empty state */
        <>
          <div className="rounded-[20px] bg-white shadow-xl border border-black/6 p-8 text-center">
            <p className="text-gray-600 mb-6">
              Walk through your day. What do you do when you wake up? After breakfast? Before bed? List each habit and rate it.
            </p>
            <button
              type="button"
              onClick={() => { setShowEmpty(false); setShowAddForm(true); }}
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
            >
              Add your first habit
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-400 text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEmpty(false)
                  setEntries([
                    { id: 'demo-1', habit_name: 'Morning journal', rating: '+', time_of_day: 'morning', sort_order: 0 },
                    { id: 'demo-2', habit_name: 'Check phone first thing', rating: '-', time_of_day: 'morning', sort_order: 1 },
                  ])
                }}
                className="text-[#e87722] hover:underline"
              >
                View with sample data
              </button>
            </p>
          )}
        </>
      )}
    </div>
  )
}
