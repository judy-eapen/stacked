'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getThisWeekBounds, getLastWeekBounds, countVotesInRange } from '@/lib/identityMetrics'
import { Users, Calendar, BarChart2, ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react'

const IDENTITY_PREFIX = 'I am a person who '
const DRAFT_MIN_LENGTH = 3
const REINFORCING_PILLS_CAP = 7

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

function avgMomentumPct(identities: Identity[]): number {
  if (identities.length === 0) return 0
  const sum = identities.reduce((acc, idn) => acc + momentumPct(idn), 0)
  return Math.round(sum / identities.length)
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
  const [collapsedLinkedHabits, setCollapsedLinkedHabits] = useState<Set<string>>(new Set())

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
      const undermining = habitsToBreak.filter((h) => h.identity_id === row.id)
      return {
        id: row.id,
        statement: row.statement,
        sort_order: row.sort_order,
        votes_this_week,
        trend_delta,
        reinforcing_habits: sorted,
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
  const totalVotesThisWeek = identities.reduce((sum, idn) => sum + idn.votes_this_week, 0)
  const avgMomentum = avgMomentumPct(identities)

  const toggleLinkedHabits = (id: string) => {
    setCollapsedLinkedHabits((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">Identity statements</h1>
            <p className="font-body text-sm text-muted-foreground mt-0.5">Who do you want to become?</p>
          </div>
        </div>
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header: title, subtitle, + Create identity button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Identity statements
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-0.5">
            Who do you want to become? Example: &ldquo;I am a person who moves every day.&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setDraftStatement(''); setShowAddForm(true); setError(null); }}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium font-body hover:opacity-90 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create identity
        </button>
      </div>

      {error && (
        <p className="font-body text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {promptForHabitIdentityId && (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm" role="dialog" aria-labelledby="prompt-title">
          <h2 id="prompt-title" className="font-heading text-lg font-semibold text-foreground">Want to add a habit for this identity?</h2>
          <p className="font-body text-sm text-muted-foreground">Pick one habit that proves you&rsquo;re becoming this person. Start with a 2-minute version.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/dashboard/habits?identity=${promptForHabitIdentityId}&mode=reinforce&new=1`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium font-body hover:opacity-90"
            >
              Create habit now
            </Link>
            <button
              type="button"
              onClick={() => setPromptForHabitIdentityId(null)}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border text-sm font-medium font-body bg-card hover:bg-muted"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {showAddForm ? (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm font-medium text-foreground">New identity</p>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setDraftStatement(''); setError(null); }}
              className="font-body text-sm text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
          <p className="font-body text-xs text-muted-foreground">Complete the sentence. Minimum {DRAFT_MIN_LENGTH} characters.</p>
          <div className="flex flex-wrap items-baseline gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="font-body text-sm text-muted-foreground">{IDENTITY_PREFIX}</span>
            <input
              type="text"
              placeholder="move every day"
              value={draftStatement}
              onChange={(e) => setDraftStatement(e.target.value)}
              className="flex-1 min-w-[120px] bg-transparent py-1.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          {draftStatement.trim().length > 0 && draftStatement.trim().length < DRAFT_MIN_LENGTH && (
            <p className="font-body text-xs text-amber-600">Add at least {DRAFT_MIN_LENGTH} characters.</p>
          )}
          <button
            type="button"
            onClick={handleCreateIdentity}
            disabled={draftStatement.trim().length < DRAFT_MIN_LENGTH || submitting}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Create identity'}
          </button>
        </div>
      ) : hasIdentities ? (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identities</span>
              </div>
              <p className="font-heading text-2xl font-bold text-foreground mt-1">{identities.length}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Votes this week</span>
              </div>
              <p className="font-heading text-2xl font-bold text-foreground mt-1">
                <span className="bg-primary/15 text-primary px-1 rounded">{totalVotesThisWeek}</span>
              </p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg momentum</span>
              </div>
              <p className="font-heading text-2xl font-bold text-foreground mt-1">
                <span className="bg-primary/15 text-primary px-1 rounded">{avgMomentum}%</span>
              </p>
            </div>
          </div>

          {/* Identity cards: 2-col grid */}
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0">
            {identities.map((idn) => {
              const linkedExpanded = !collapsedLinkedHabits.has(idn.id)
              const reinforcingShow = idn.reinforcing_habits.slice(0, REINFORCING_PILLS_CAP)
              const hasMoreReinforcing = idn.reinforcing_total > REINFORCING_PILLS_CAP
              return (
                <li key={idn.id} className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm">
                  {editingId === idn.id ? (
                    <div className="space-y-2">
                      <input
                        id={`edit-identity-${idn.id}`}
                        type="text"
                        defaultValue={idn.statement}
                        className="w-full h-10 px-3 rounded-lg border border-border font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="font-body text-sm font-medium text-primary hover:underline"
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
                        <button type="button" onClick={() => setEditingId(null)} className="font-body text-sm text-muted-foreground hover:underline">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="font-heading text-lg font-semibold text-foreground">{idn.statement}</h2>
                          <p className="font-body text-sm text-foreground mt-1">{idn.votes_this_week} votes this week</p>
                          <p className={`font-body text-sm mt-0.5 ${idn.trend_delta !== null && idn.trend_delta >= 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {idn.trend_delta !== null
                              ? idn.trend_delta >= 0
                                ? `↑ +${idn.trend_delta} vs last week`
                                : `↓ ${idn.trend_delta} vs last week`
                              : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => setEditingId(idn.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" aria-label="Edit identity">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-muted"
                            aria-label="Delete identity"
                            onClick={async () => {
                              const supabase = createClient()
                              const { data: { user } } = await supabase.auth.getUser()
                              if (!user) return
                              await supabase.from('identities').delete().eq('id', idn.id).eq('user_id', user.id)
                              fetchIdentities()
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Momentum */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Momentum</span>
                          <span className="font-body text-sm font-medium text-foreground">{momentumPct(idn)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, momentumPct(idn)))}%` }}
                          />
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-1">How much you showed up this week vs. max possible (7 days × habits).</p>
                      </div>

                      {/* Linked habits (collapsible) */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleLinkedHabits(idn.id)}
                          className="flex items-center justify-between w-full font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                          aria-expanded={linkedExpanded}
                        >
                          Linked habits
                          {linkedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {linkedExpanded && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                                <span className="font-body text-xs font-medium text-foreground">Reinforcing ({idn.reinforcing_total})</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {reinforcingShow.map((h) => (
                                  <span key={h.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-800 font-body text-sm border border-green-200">
                                    {h.name}
                                  </span>
                                ))}
                                {hasMoreReinforcing && (
                                  <Link href={`/dashboard/identities/${idn.id}`} className="font-body text-xs text-primary hover:underline inline-flex items-center">
                                    View all
                                  </Link>
                                )}
                                <Link
                                  href={`/dashboard/habits?identity=${idn.id}&mode=reinforce&new=1`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-muted-foreground font-body text-sm hover:bg-muted"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add habit
                                </Link>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden />
                                <span className="font-body text-xs font-medium text-foreground">Undermining ({idn.undermining.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {idn.undermining.length === 0 ? (
                                  <Link
                                    href={`/dashboard/habits?addBlockerFor=${idn.id}`}
                                    className="font-body text-sm text-muted-foreground hover:text-primary hover:underline"
                                  >
                                    No blockers linked yet. + Add one
                                  </Link>
                                ) : (
                                  <>
                                    {idn.undermining.map((h) => (
                                      <span key={h.id} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-800 font-body text-sm border border-red-200">
                                        {h.name}
                                      </span>
                                    ))}
                                    <Link
                                      href={`/dashboard/habits?addBlockerFor=${idn.id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-muted-foreground font-body text-sm hover:bg-muted"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Add blocker
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                        <Link
                          href={`/dashboard/habits?identity=${idn.id}&mode=reinforce&new=1`}
                          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90"
                        >
                          <Plus className="h-4 w-4" />
                          Add reinforcing habit
                        </Link>
                        <Link
                          href={idn.undermining.length === 0 ? `/dashboard/habits?addBlockerFor=${idn.id}` : `/dashboard/identities/${idn.id}?blockers=1`}
                          className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border font-body text-sm font-medium bg-card hover:bg-muted text-foreground"
                        >
                          {idn.undermining.length === 0 ? 'Add a blocking habit' : 'View & fix blockers'}
                        </Link>
                        <Link
                          href={`/dashboard/identities/${idn.id}`}
                          className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border font-body text-sm font-medium bg-card hover:bg-muted text-foreground"
                        >
                          View details
                        </Link>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-8 text-center">
          <p className="font-body text-muted-foreground mb-6">Who do you want to become? Write it down.</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-body font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
            Create your first identity
          </button>
        </div>
      )}
    </div>
  )
}
