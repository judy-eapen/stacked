'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DesignBreak } from '@/lib/db-types'

const EMPTY_DESIGN_BREAK: DesignBreak = {
  invisible: { remove_cues: '', change_environment: '', avoid_triggers: '' },
  unattractive: { reframe_cost: '', highlight_downside: '', negative_identity: '' },
  difficult: { increase_friction: '', add_steps: '', add_accountability: '' },
  unsatisfying: { immediate_consequence: '', accountability_partner: '', loss_based: '' },
}

function trimDesignBreak(d: DesignBreak | null | undefined): DesignBreak | null {
  if (!d) return null
  const out: DesignBreak = {}
  const keys = ['invisible', 'unattractive', 'difficult', 'unsatisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      const trimmed: Record<string, string> = {}
      for (const [k, v] of Object.entries(section)) {
        if (typeof v === 'string') trimmed[k] = v.trim()
      }
      if (Object.keys(trimmed).length) (out as Record<string, unknown>)[law] = trimmed
    }
  }
  return Object.keys(out).length ? out : null
}

function DesignBreakForm({ value, onChange }: { value: DesignBreak; onChange: (v: DesignBreak) => void }) {
  const d = {
    invisible: { ...EMPTY_DESIGN_BREAK.invisible, ...value?.invisible },
    unattractive: { ...EMPTY_DESIGN_BREAK.unattractive, ...value?.unattractive },
    difficult: { ...EMPTY_DESIGN_BREAK.difficult, ...value?.difficult },
    unsatisfying: { ...EMPTY_DESIGN_BREAK.unsatisfying, ...value?.unsatisfying },
  }
  const set = (law: keyof DesignBreak, field: string, val: string) => {
    onChange({ ...value, [law]: { ...d[law], [field]: val } })
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">1. Make it invisible</p>
        <input placeholder="Remove cues" value={d.invisible?.remove_cues ?? ''} onChange={(e) => set('invisible', 'remove_cues', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Change environment" value={d.invisible?.change_environment ?? ''} onChange={(e) => set('invisible', 'change_environment', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Avoid trigger situations" value={d.invisible?.avoid_triggers ?? ''} onChange={(e) => set('invisible', 'avoid_triggers', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">2. Make it unattractive</p>
        <input placeholder="Reframe the cost" value={d.unattractive?.reframe_cost ?? ''} onChange={(e) => set('unattractive', 'reframe_cost', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Highlight long-term downside" value={d.unattractive?.highlight_downside ?? ''} onChange={(e) => set('unattractive', 'highlight_downside', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Associate with negative identity" value={d.unattractive?.negative_identity ?? ''} onChange={(e) => set('unattractive', 'negative_identity', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">3. Make it difficult</p>
        <input placeholder="Increase friction" value={d.difficult?.increase_friction ?? ''} onChange={(e) => set('difficult', 'increase_friction', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Add steps" value={d.difficult?.add_steps ?? ''} onChange={(e) => set('difficult', 'add_steps', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Add accountability" value={d.difficult?.add_accountability ?? ''} onChange={(e) => set('difficult', 'add_accountability', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">4. Make it unsatisfying</p>
        <input placeholder="Immediate consequence" value={d.unsatisfying?.immediate_consequence ?? ''} onChange={(e) => set('unsatisfying', 'immediate_consequence', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Accountability partner" value={d.unsatisfying?.accountability_partner ?? ''} onChange={(e) => set('unsatisfying', 'accountability_partner', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Loss-based mechanism" value={d.unsatisfying?.loss_based ?? ''} onChange={(e) => set('unsatisfying', 'loss_based', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
    </div>
  )
}

interface Identity {
  id: string
  statement: string
  sort_order: number
  votes_this_week?: number
  votes_delta_from_yesterday?: number
  supported_by_habits?: string[]
  conflicted_by_habits?: string[]
}

function consistencyPct(idn: Identity): number {
  const n = (idn.supported_by_habits ?? []).length
  if (n === 0) return 0
  const maxVotes = n * 7
  return Math.min(100, Math.round(((idn.votes_this_week ?? 0) / maxVotes) * 100))
}

const IDENTITY_PREFIX = 'I am a person who '
const DRAFT_MIN_LENGTH = 3

interface ScorecardEntryForLink {
  id: string
  habit_name: string
  identity_id: string | null
}

interface HabitToBreak {
  id: string
  user_id: string
  identity_id: string
  name: string
  design_break: DesignBreak | null
  created_at: string
  updated_at: string
}

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [scorecardEntries, setScorecardEntries] = useState<ScorecardEntryForLink[]>([])
  const [habitsToBreak, setHabitsToBreak] = useState<HabitToBreak[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingHabitToBreakForIdentityId, setEditingHabitToBreakForIdentityId] = useState<string | null>(null)
  const [habitToBreakDraftName, setHabitToBreakDraftName] = useState('')
  const [habitToBreakDraftDesign, setHabitToBreakDraftDesign] = useState<DesignBreak>(() => ({ ...EMPTY_DESIGN_BREAK }))
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)
  const [draftStatement, setDraftStatement] = useState('')
  const [draftLinkedEntryIds, setDraftLinkedEntryIds] = useState<string[]>([])
  const [draftNewHabitNames, setDraftNewHabitNames] = useState<string[]>([])
  const [newHabitNameInput, setNewHabitNameInput] = useState('')

  const fetchIdentities = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [identitiesRes, scorecardRes, habitsToBreakRes] = await Promise.all([
      supabase.from('identities').select('id, statement, sort_order').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('scorecard_entries').select('id, habit_name, identity_id').eq('user_id', user.id),
      supabase.from('habits_to_break').select('*').eq('user_id', user.id),
    ])
    if (identitiesRes.error) {
      setError(identitiesRes.error.message)
      setIdentities([])
      return
    }
    const entries = (scorecardRes.data ?? []).map((row) => ({
      id: row.id,
      habit_name: row.habit_name,
      identity_id: row.identity_id ?? null,
    }))
    setScorecardEntries(entries)
    if (habitsToBreakRes.data) setHabitsToBreak(habitsToBreakRes.data as HabitToBreak[])
    const list = (identitiesRes.data ?? []).map((row) => {
      const supported = entries.filter((e) => e.identity_id === row.id).map((e) => e.habit_name)
      return {
        id: row.id,
        statement: row.statement,
        sort_order: row.sort_order,
        votes_this_week: 0,
        votes_delta_from_yesterday: 0,
        supported_by_habits: supported,
        conflicted_by_habits: [],
      }
    })
    setIdentities(list)
    setError(null)
  }, [])

  useEffect(() => {
    fetchIdentities().finally(() => setLoading(false))
  }, [fetchIdentities])

  const hasIdentities = identities.length > 0

  const resetCreateFlow = () => {
    setShowAddForm(false)
    setCreateStep(1)
    setDraftStatement('')
    setDraftLinkedEntryIds([])
    setDraftNewHabitNames([])
    setNewHabitNameInput('')
  }

  const toggleLinkedEntry = (entryId: string) => {
    setDraftLinkedEntryIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    )
  }

  const addNewHabit = () => {
    const name = newHabitNameInput.trim().slice(0, 200)
    if (!name) return
    setDraftNewHabitNames((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setNewHabitNameInput('')
  }

  const removeNewHabit = (name: string) => {
    setDraftNewHabitNames((prev) => prev.filter((n) => n !== name))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Identity statements</h1>
          <p className="text-sm text-gray-500">Who do you want to become? Example: &ldquo;I am a person who moves every day.&rdquo;</p>
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Concept explainer */}
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

      {showAddForm ? (
            <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  New identity — Step {createStep} of 3
                </p>
                <button
                  type="button"
                  onClick={resetCreateFlow}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>

              {createStep === 1 && (
                <>
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
                    onClick={() => setCreateStep(2)}
                    disabled={draftStatement.trim().length < DRAFT_MIN_LENGTH}
                    className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </>
              )}

              {createStep === 2 && (
                <>
                  <p className="text-xs text-gray-500 mb-2">Link habits that support this identity. You can pick from your scorecard or add a new habit.</p>
                  {scorecardEntries.length > 0 ? (
                    <ul className="space-y-2 mb-4">
                      {scorecardEntries.map((entry) => (
                        <li key={entry.id}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftLinkedEntryIds.includes(entry.id)}
                              onChange={() => toggleLinkedEntry(entry.id)}
                              className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
                            />
                            <span className="text-sm text-gray-800">{entry.habit_name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">No habits on your scorecard yet. Add one below.</p>
                  )}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <p className="text-xs font-medium text-gray-700">Create a new habit and link it</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Walk 10 minutes after lunch"
                        value={newHabitNameInput}
                        onChange={(e) => setNewHabitNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewHabit())}
                        className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                      />
                      <button
                        type="button"
                        onClick={addNewHabit}
                        disabled={!newHabitNameInput.trim()}
                        className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {draftNewHabitNames.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {draftNewHabitNames.map((name) => (
                          <li key={name} className="flex items-center justify-between gap-2 text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
                            <span>{name}</span>
                            <button type="button" onClick={() => removeNewHabit(name)} className="text-gray-500 hover:text-red-600 text-xs">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateStep(3)}
                      className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}

              {createStep === 3 && (
                <>
                  <p className="text-xs text-gray-500">Confirm.</p>
                  <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
                    <p className="font-medium text-gray-900">
                      &ldquo;{IDENTITY_PREFIX}{draftStatement.trim()}{draftStatement.trim().endsWith('.') ? '' : '.'}&rdquo;
                    </p>
                    {(() => {
                      const linkedNames = draftLinkedEntryIds
                        .map((id) => scorecardEntries.find((e) => e.id === id)?.habit_name)
                        .filter(Boolean) as string[]
                      const allNames = [...linkedNames, ...draftNewHabitNames]
                      return allNames.length > 0 ? (
                        <p className="text-gray-600">Supported by: {allNames.join(', ')}</p>
                      ) : (
                        <p className="text-gray-500">No habits linked yet.</p>
                      )
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const completion = draftStatement.trim()
                        const statement = (IDENTITY_PREFIX + completion + (completion.endsWith('.') ? '' : '.')).slice(0, 500)
                        const supabase = createClient()
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) return
                        const { data: newIdentity, error: insertErr } = await supabase
                          .from('identities')
                          .insert({
                            user_id: user.id,
                            statement,
                            sort_order: identities.length,
                          })
                          .select('id')
                          .single()
                        if (insertErr) {
                          setError(insertErr.message)
                          return
                        }
                        const identityId = newIdentity.id
                        if (draftLinkedEntryIds.length > 0) {
                          await supabase
                            .from('scorecard_entries')
                            .update({ identity_id: identityId })
                            .in('id', draftLinkedEntryIds)
                            .eq('user_id', user.id)
                        }
                        if (draftNewHabitNames.length > 0) {
                          const maxOrder = scorecardEntries.length + draftNewHabitNames.length
                          for (let i = 0; i < draftNewHabitNames.length; i++) {
                            await supabase.from('scorecard_entries').insert({
                              user_id: user.id,
                              habit_name: draftNewHabitNames[i].trim().slice(0, 200),
                              rating: '=',
                              time_of_day: 'anytime',
                              sort_order: maxOrder + i,
                              identity_id: identityId,
                            })
                          }
                        }
                        resetCreateFlow()
                        fetchIdentities()
                      }}
                      className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}
            </div>
      ) : hasIdentities ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">Your identities</p>
            <button
              type="button"
              onClick={() => {
                setCreateStep(1)
                setDraftStatement('')
                setDraftLinkedEntryIds([])
                setDraftNewHabitNames([])
                setShowAddForm(true)
              }}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              + Create identity
            </button>
          </div>

          <ul className="space-y-3">
            {identities.map((idn) => {
              const consistency = consistencyPct(idn)
              const hasConflicts = (idn.conflicted_by_habits ?? []).length > 0
              const showConflictFirst = hasConflicts && consistency < 50
              return (
              <li
                key={idn.id}
                className="rounded-xl bg-white border border-gray-200/80 p-4 flex items-start justify-between gap-3"
              >
                {editingId === idn.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      id={`edit-identity-${idn.id}`}
                      type="text"
                      defaultValue={idn.statement}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
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
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-sm text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      {hasConflicts && (
                        <p className="text-xs font-medium text-amber-700 mb-2">
                          ⚠ {(idn.conflicted_by_habits ?? []).length} conflicting habit{(idn.conflicted_by_habits ?? []).length !== 1 ? 's' : ''}
                        </p>
                      )}
                      <p className="text-gray-900">{idn.statement}</p>
                      <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                        <p>→ {idn.votes_this_week ?? 0} votes this week</p>
                        <p>
                          → {(idn.votes_delta_from_yesterday ?? 0) >= 0 ? '+' : ''}{idn.votes_delta_from_yesterday ?? 0} from yesterday
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#e87722]/80"
                            style={{ width: `${Math.min(100, Math.max(0, consistency))}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">Consistency: {consistency}%</span>
                      </div>
                      {((idn.supported_by_habits ?? []).length > 0 || (idn.conflicted_by_habits ?? []).length > 0) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                          {showConflictFirst && hasConflicts && (
                            <div className="rounded-lg bg-red-50/90 border border-red-200/60 p-3">
                              <p className="font-medium text-red-800 mb-1">Conflicted by:</p>
                              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                                {(idn.conflicted_by_habits ?? []).map((habit) => (
                                  <li key={habit}>{habit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(idn.supported_by_habits ?? []).length > 0 && (
                            <div>
                              <p className="font-medium text-gray-500 mb-1">Supported by:</p>
                              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                                {(idn.supported_by_habits ?? []).map((habit) => (
                                  <li key={habit}>{habit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {!showConflictFirst && hasConflicts && (
                            <div className="rounded-lg bg-red-50/90 border border-red-200/60 p-3">
                              <p className="font-medium text-red-800 mb-1">Conflicted by:</p>
                              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                                {(idn.conflicted_by_habits ?? []).map((habit) => (
                                  <li key={habit}>{habit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {(() => {
                        const htb = habitsToBreak.find((h) => h.identity_id === idn.id)
                        const isEditingHtb = editingHabitToBreakForIdentityId === idn.id
                        if (isEditingHtb) {
                          const matchingScorecardName = scorecardEntries.some((e) => e.habit_name === habitToBreakDraftName) ? habitToBreakDraftName : ''
                          return (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Habit to break (contradicts this identity)</p>
                              {scorecardEntries.length > 0 && (
                                <div className="mb-2">
                                  <label className="block text-xs text-gray-500 mb-1">Select from scorecard</label>
                                  <select
                                    value={matchingScorecardName}
                                    onChange={(e) => setHabitToBreakDraftName(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
                                  >
                                    <option value="">— Or type a new habit below —</option>
                                    {scorecardEntries.map((e) => (
                                      <option key={e.id} value={e.habit_name}>{e.habit_name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <label className="block text-xs text-gray-500 mb-1">{scorecardEntries.length > 0 ? 'Habit name (edit or type new)' : 'Habit name'}</label>
                              <input
                                type="text"
                                placeholder="e.g. Scrolling after dinner"
                                value={habitToBreakDraftName}
                                onChange={(e) => setHabitToBreakDraftName(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
                              />
                              <p className="text-xs font-medium text-gray-600 mb-2">How to break it (4 laws)</p>
                              <DesignBreakForm value={habitToBreakDraftDesign} onChange={setHabitToBreakDraftDesign} />
                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const name = habitToBreakDraftName.trim().slice(0, 200)
                                    if (!name) return
                                    const supabase = createClient()
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (!user) return
                                    const db = trimDesignBreak(habitToBreakDraftDesign)
                                    if (htb) {
                                      const { error: err } = await supabase.from('habits_to_break').update({ name, design_break: db }).eq('id', htb.id).eq('user_id', user.id)
                                      if (err) setError(err.message)
                                    } else {
                                      const { error: err } = await supabase.from('habits_to_break').insert({ user_id: user.id, identity_id: idn.id, name, design_break: db })
                                      if (err) setError(err.message)
                                    }
                                    setEditingHabitToBreakForIdentityId(null)
                                    fetchIdentities()
                                  }}
                                  disabled={!habitToBreakDraftName.trim()}
                                  className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingHabitToBreakForIdentityId(null)
                                    setHabitToBreakDraftName('')
                                    setHabitToBreakDraftDesign({ ...EMPTY_DESIGN_BREAK })
                                  }}
                                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )
                        }
                        if (htb) {
                          return (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Habit to break</p>
                              <p className="text-sm font-medium text-gray-900">{htb.name}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHabitToBreakForIdentityId(idn.id)
                                  setHabitToBreakDraftName(htb.name)
                                  setHabitToBreakDraftDesign({
                                    ...EMPTY_DESIGN_BREAK,
                                    ...htb.design_break,
                                    invisible: { ...EMPTY_DESIGN_BREAK.invisible, ...htb.design_break?.invisible },
                                    unattractive: { ...EMPTY_DESIGN_BREAK.unattractive, ...htb.design_break?.unattractive },
                                    difficult: { ...EMPTY_DESIGN_BREAK.difficult, ...htb.design_break?.difficult },
                                    unsatisfying: { ...EMPTY_DESIGN_BREAK.unsatisfying, ...htb.design_break?.unsatisfying },
                                  })
                                }}
                                className="mt-1 text-xs text-[#e87722] hover:underline"
                              >
                                Edit how to break it
                              </button>
                            </div>
                          )
                        }
                        return (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHabitToBreakForIdentityId(idn.id)
                                setHabitToBreakDraftName('')
                                setHabitToBreakDraftDesign({ ...EMPTY_DESIGN_BREAK })
                              }}
                              className="text-sm text-[#e87722] hover:underline"
                            >
                              + Add habit to break (contradicts this identity)
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(idn.id)}
                        className="text-gray-400 hover:text-gray-600 p-1 text-sm"
                        aria-label="Edit"
                      >
                        ✎
                      </button>
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
                  </>
                )}
              </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <div className="rounded-[20px] bg-white shadow-xl border border-black/6 p-8 text-center">
            <p className="text-gray-600 mb-6">
              Who do you want to become? Write it down.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
            >
              Create your first identity
            </button>
          </div>
        </>
      )}
    </div>
  )
}
