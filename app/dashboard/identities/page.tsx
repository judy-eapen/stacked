'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getThisWeekBounds, getLastWeekBounds, countVotesInRange } from '@/lib/identityMetrics'

const IDENTITY_PREFIX = 'I am a person who '
const DRAFT_MIN_LENGTH = 3

interface ReinforcingHabit {
  id: string
  name: string
  two_minute_version: string | null
  last_completed_date: string | null
  sort_order: number
}

interface HabitToBreak {
  id: string
  user_id: string
  identity_id: string
  name: string
  design_break: unknown
  created_at: string
  updated_at: string
}

interface Identity {
  id: string
  statement: string
  sort_order: number
  votes_this_week: number
  trend_delta: number | null
  reinforcing_habits: ReinforcingHabit[]
  reinforcing_total: number
  undermining: HabitToBreak[]
}

function momentumPct(idn: Identity): number {
  const n = idn.reinforcing_habits.length
  if (n === 0) return 0
  const maxVotes = n * 7
  return Math.min(100, Math.round((idn.votes_this_week / maxVotes) * 100))
}

export default function IdentitiesPage() {
  const searchParams = useSearchParams()
  const [identities, setIdentities] = useState<Identity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftStatement, setDraftStatement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [promptForHabitIdentityId, setPromptForHabitIdentityId] = useState<string | null>(null)

  const fetchIdentities = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [identitiesRes, habitsToBreakRes, habitsRes] = await Promise.all([
      supabase.from('identities').select('id, statement, sort_order').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('habits_to_break').select('*').eq('user_id', user.id),
      supabase.from('habits').select('id, identity_id, name, two_minute_version, last_completed_date, sort_order').eq('user_id', user.id).is('archived_at', null).order('sort_order', { ascending: true }),
    ])
    if (identitiesRes.error) {
      setError(identitiesRes.error.message)
      setIdentities([])
      return
    }
    const habits = (habitsRes.data ?? []) as (ReinforcingHabit & { identity_id: string | null })[]
    const habitsToBreak = (habitsToBreakRes.data ?? []) as HabitToBreak[]
    const thisWeek = getThisWeekBounds()
    const lastWeek = getLastWeekBounds()

    const list: Identity[] = (identitiesRes.data ?? []).map((row: { id: string; statement: string; sort_order: number }) => {
      const identityHabits = habits.filter((h) => h.identity_id === row.id)
      const withCompletion = identityHabits.filter((h) => h.last_completed_date)
      const votes_this_week = countVotesInRange(withCompletion, thisWeek)
      const votes_last_week = countVotesInRange(withCompletion, lastWeek)
      const trend_delta = votes_this_week - votes_last_week
      const sorted = identityHabits
        .slice()
        .sort((a, b) => (b.last_completed_date ?? '').localeCompare(a.last_completed_date ?? '') || a.sort_order - b.sort_order)
      const reinforcing_habits = sorted.slice(0, 3)
      const undermining = habitsToBreak.filter((h) => h.identity_id === row.id).slice(0, 2)
      return {
        id: row.id,
        statement: row.statement,
        sort_order: row.sort_order,
        votes_this_week: votes_this_week,
        trend_delta,
        reinforcing_habits,
        reinforcing_total: identityHabits.length,
        undermining,
      }
    })
    setIdentities(list)
    setError(null)
  }, [])

  useEffect(() => {
    fetchIdentities().finally(() => setLoading(false))
  }, [fetchIdentities])

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowAddForm(true)
    }
  }, [searchParams])

  const hasIdentities = identities.length > 0

  const handleCreateIdentity = async () => {
    const completion = draftStatement.trim()
    if (completion.length < DRAFT_MIN_LENGTH) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const statement = (IDENTITY_PREFIX + completion + (completion.endsWith('.') ? '' : '.')).slice(0, 500)
    const { data: newIdentity, error: insertErr } = await supabase
      .from('identities')
      .insert({ user_id: user.id, statement, sort_order: identities.length })
      .select('id')
      .single()
    if (insertErr) {
      setError(insertErr.message)
      setSubmitting(false)
      return
    }
    setShowAddForm(false)
    setDraftStatement('')
    setSubmitting(false)
    await fetchIdentities()
    setPromptForHabitIdentityId(newIdentity.id)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Identity statements</h1>
          <p className="text-sm text-gray-500">Who do you want to become?</p>
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Identity statements
        </h1>
        <p className="text-sm text-gray-500">
          Who do you want to become? Example: &ldquo;I am a person who moves every day.&rdquo;
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {promptForHabitIdentityId && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4 shadow-lg" role="dialog" aria-labelledby="prompt-title">
          <h2 id="prompt-title" className="text-lg font-semibold text-gray-900">Want to add a habit for this identity?</h2>
          <p className="text-sm text-gray-600">Pick one habit that proves you&rsquo;re becoming this person. Start with a 2-minute version.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/dashboard/habits?identity=${promptForHabitIdentityId}&mode=reinforce&new=1`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
            >
              Create habit now
            </Link>
            <button
              type="button"
              onClick={() => setPromptForHabitIdentityId(null)}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {showAddForm ? (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">New identity</p>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setDraftStatement(''); setError(null); }}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500">Complete the sentence. Minimum {DRAFT_MIN_LENGTH} characters.</p>
          <div className="flex flex-wrap items-baseline gap-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
            <span className="text-sm text-gray-500">{IDENTITY_PREFIX}</span>
            <input
              type="text"
              placeholder="move every day"
              value={draftStatement}
              onChange={(e) => setDraftStatement(e.target.value)}
              className="flex-1 min-w-[120px] bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          {draftStatement.trim().length > 0 && draftStatement.trim().length < DRAFT_MIN_LENGTH && (
            <p className="text-xs text-amber-600">Add at least {DRAFT_MIN_LENGTH} characters.</p>
          )}
          <button
            type="button"
            onClick={handleCreateIdentity}
            disabled={draftStatement.trim().length < DRAFT_MIN_LENGTH || submitting}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Create identity'}
          </button>
        </div>
      ) : hasIdentities ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">Your identities</p>
            <button
              type="button"
              onClick={() => { setDraftStatement(''); setShowAddForm(true); }}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              + Create identity
            </button>
          </div>

          <ul className="space-y-4">
            {identities.map((idn) => (
              <li key={idn.id} className="rounded-xl bg-white border border-gray-200/80 p-5 space-y-4">
                {editingId === idn.id ? (
                  <div className="space-y-2">
                    <input
                      id={`edit-identity-${idn.id}`}
                      type="text"
                      defaultValue={idn.statement}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-[#e87722] hover:underline"
                        onClick={async () => {
                          const val = (document.getElementById(`edit-identity-${idn.id}`) as HTMLInputElement)?.value?.trim().slice(0, 500)
                          if (!val) return
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) return
                          const { error: err } = await supabase.from('identities').update({ statement: val }).eq('id', idn.id).eq('user_id', user.id)
                          if (err) setError(err.message)
                          else { setEditingId(null); fetchIdentities(); }
                        }}
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">{idn.statement}</h2>
                        <p className="text-sm text-gray-600 mt-1">This week: {idn.votes_this_week} votes</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {idn.trend_delta !== null
                            ? idn.trend_delta >= 0
                              ? `↑ +${idn.trend_delta} vs last week`
                              : `↓ ${idn.trend_delta} vs last week`
                            : 'Trend: —'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#e87722]/80"
                              style={{ width: `${Math.min(100, Math.max(0, momentumPct(idn)))}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 shrink-0">Momentum: {momentumPct(idn)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setEditingId(idn.id)} className="text-gray-400 hover:text-gray-600 p-1 text-sm" aria-label="Edit">✎</button>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-600 p-1 text-sm"
                          aria-label="Delete"
                          onClick={async () => {
                            const supabase = createClient()
                            const { data: { user } } = await supabase.auth.getUser()
                            if (!user) return
                            await supabase.from('identities').delete().eq('id', idn.id).eq('user_id', user.id)
                            fetchIdentities()
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Reinforced by</p>
                      {idn.reinforcing_habits.length === 0 ? (
                        <p className="text-sm text-gray-500">No habits linked yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {idn.reinforcing_habits.map((h) => (
                            <li key={h.id} className="text-sm text-gray-700 flex justify-between gap-2">
                              <span>{h.name}</span>
                              {h.two_minute_version && <span className="text-gray-500 text-xs shrink-0">2-min: {h.two_minute_version}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {idn.reinforcing_total > 3 && (
                        <Link href={`/dashboard/habits?identity=${idn.id}`} className="text-xs text-[#e87722] hover:underline mt-1 inline-block">View all</Link>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Undermined by</p>
                      {idn.undermining.length === 0 ? (
                        <p className="text-sm text-gray-500">No blockers linked yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {idn.undermining.map((h) => (
                            <li key={h.id} className="text-sm text-gray-700">{h.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Link
                        href={`/dashboard/habits?identity=${idn.id}&mode=reinforce&new=1`}
                        className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
                      >
                        + Add reinforcing habit
                      </Link>
                      <Link
                        href={`/dashboard/habits?identity=${idn.id}&mode=fix`}
                        className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                      >
                        View & fix blockers →
                      </Link>
                      <Link
                        href={`/dashboard/habits?identity=${idn.id}`}
                        className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                      >
                        View details
                      </Link>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="rounded-[20px] bg-white shadow-xl border border-black/6 p-8 text-center">
          <p className="text-gray-600 mb-6">Who do you want to become? Write it down.</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
          >
            Create your first identity
          </button>
        </div>
      )}
    </div>
  )
}
