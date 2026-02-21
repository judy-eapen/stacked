'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [scorecardEntries, setScorecardEntries] = useState<ScorecardEntryForLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)
  const [draftStatement, setDraftStatement] = useState('')
  const [draftLinkedEntryIds, setDraftLinkedEntryIds] = useState<string[]>([])
  const [draftNewHabitNames, setDraftNewHabitNames] = useState<string[]>([])
  const [newHabitNameInput, setNewHabitNameInput] = useState('')

  const fetchIdentities = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [identitiesRes, scorecardRes] = await Promise.all([
      supabase.from('identities').select('id, statement, sort_order').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('scorecard_entries').select('id, habit_name, identity_id').eq('user_id', user.id),
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

      {hasIdentities ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">Your identities</p>
            <button
              type="button"
              onClick={() => {
                if (!showAddForm) {
                  setCreateStep(1)
                  setDraftStatement('')
                  setDraftLinkedEntryIds([])
                  setDraftNewHabitNames([])
                }
                setShowAddForm((v) => !v)
              }}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              + Create identity
            </button>
          </div>

          {showAddForm && (
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
          )}

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
