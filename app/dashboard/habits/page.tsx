'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

interface ImplementationIntention {
  behavior?: string
  time?: string
  location?: string
}

interface Habit {
  id: string
  user_id: string
  identity_id: string | null
  name: string
  two_minute_version: string | null
  implementation_intention: ImplementationIntention | null
  stack_anchor_scorecard_id: string | null
  stack_anchor_habit_id: string | null
  temptation_bundle: string | null
  frequency: HabitFrequency
  custom_days: number[] | null
  is_active: boolean
  is_shared: boolean
  sort_order: number
  current_streak: number
  last_completed_date: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

interface IdentityOption {
  id: string
  statement: string
  sort_order: number
}

interface ScorecardAnchor {
  id: string
  habit_name: string
}

function hasDesignFields(h: Habit): boolean {
  const hasIntention = h.implementation_intention && (
    (h.implementation_intention.behavior ?? '').trim() ||
    (h.implementation_intention.time ?? '').trim() ||
    (h.implementation_intention.location ?? '').trim()
  )
  return !!(
    hasIntention ||
    (h.two_minute_version ?? '').trim() ||
    (h.temptation_bundle ?? '').trim() ||
    h.stack_anchor_scorecard_id ||
    h.stack_anchor_habit_id
  )
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([])
  const [identities, setIdentities] = useState<IdentityOption[]>([])
  const [scorecardEntries, setScorecardEntries] = useState<ScorecardAnchor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDesignSection, setShowDesignSection] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [draftName, setDraftName] = useState('')
  const [draftIdentityId, setDraftIdentityId] = useState<string | null>(null)
  const [draftBehavior, setDraftBehavior] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [draftLocation, setDraftLocation] = useState('')
  const [draftStackScorecardId, setDraftStackScorecardId] = useState<string | null>(null)
  const [draftStackHabitId, setDraftStackHabitId] = useState<string | null>(null)
  const [draftTemptationBundle, setDraftTemptationBundle] = useState('')
  const [draftTwoMinute, setDraftTwoMinute] = useState('')

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [habitsRes, archivedRes, identitiesRes, scorecardRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).is('archived_at', null).order('sort_order', { ascending: true }),
      supabase.from('habits').select('*').eq('user_id', user.id).not('archived_at', 'is', null).order('updated_at', { ascending: false }),
      supabase.from('identities').select('id, statement, sort_order').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('scorecard_entries').select('id, habit_name').eq('user_id', user.id).order('sort_order', { ascending: true }),
    ])
    if (habitsRes.error) {
      setError(habitsRes.error.message)
      setHabits([])
    } else {
      setHabits((habitsRes.data ?? []) as Habit[])
      setError(null)
    }
    if (archivedRes.error) setArchivedHabits([])
    else setArchivedHabits((archivedRes.data ?? []) as Habit[])
    if (identitiesRes.error) setIdentities([])
    else setIdentities((identitiesRes.data ?? []) as IdentityOption[])
    if (scorecardRes.error) setScorecardEntries([])
    else setScorecardEntries((scorecardRes.data ?? []) as ScorecardAnchor[])
  }, [])

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  const activeHabits = habits.filter((h) => h.is_active)
  const habitsByIdentity = new Map<string | null, Habit[]>()
  habitsByIdentity.set(null, [])
  identities.forEach((idn) => habitsByIdentity.set(idn.id, []))
  activeHabits.forEach((h) => {
    const key = h.identity_id ?? null
    const list = habitsByIdentity.get(key) ?? []
    list.push(h)
    habitsByIdentity.set(key, list)
  })

  const resetCreateForm = () => {
    setDraftName('')
    setDraftIdentityId(null)
    setDraftBehavior('')
    setDraftTime('')
    setDraftLocation('')
    setDraftStackScorecardId(null)
    setDraftStackHabitId(null)
    setDraftTemptationBundle('')
    setDraftTwoMinute('')
    setShowDesignSection(false)
    setShowAddForm(false)
  }

  const createHabit = async () => {
    const name = draftName.trim().slice(0, 200)
    if (!name) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const intention =
      (draftBehavior.trim() || draftTime.trim() || draftLocation.trim())
        ? {
            behavior: draftBehavior.trim().slice(0, 200) || undefined,
            time: draftTime.trim().slice(0, 100) || undefined,
            location: draftLocation.trim().slice(0, 200) || undefined,
          }
        : null
    const onlyOneStack = draftStackScorecardId ? { stack_anchor_scorecard_id: draftStackScorecardId, stack_anchor_habit_id: null } : draftStackHabitId ? { stack_anchor_scorecard_id: null, stack_anchor_habit_id: draftStackHabitId } : {}
    const { error: err } = await supabase.from('habits').insert({
      user_id: user.id,
      identity_id: draftIdentityId || null,
      name,
      two_minute_version: draftTwoMinute.trim().slice(0, 200) || null,
      implementation_intention: intention,
      temptation_bundle: draftTemptationBundle.trim().slice(0, 500) || null,
      frequency: 'daily',
      sort_order: habits.length,
      ...onlyOneStack,
    })
    if (err) {
      setError(err.message)
      return
    }
    resetCreateForm()
    fetchAll()
  }

  const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from('habits').update(updates).eq('id', habitId).eq('user_id', user.id)
    if (err) setError(err.message)
    else {
      setEditingId(null)
      fetchAll()
    }
  }

  const archiveHabit = (id: string) => {
    updateHabit(id, { archived_at: new Date().toISOString(), is_active: false })
  }

  const restoreHabit = (id: string) => {
    updateHabit(id, { archived_at: null, is_active: true, current_streak: 0 })
  }

  const deleteHabit = async (id: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from('habits').delete().eq('id', id).eq('user_id', user.id)
    if (err) setError(err.message)
    else {
      setEditingId(null)
      fetchAll()
    }
  }

  const getStackLabel = (h: Habit): string | null => {
    if (h.stack_anchor_scorecard_id) {
      const e = scorecardEntries.find((e) => e.id === h.stack_anchor_scorecard_id)
      return e ? `After "${e.habit_name}"` : null
    }
    if (h.stack_anchor_habit_id) {
      const other = habits.find((o) => o.id === h.stack_anchor_habit_id)
      return other ? `After "${other.name}"` : null
    }
    return null
  }

  const intentionString = (h: Habit): string | null => {
    const i = h.implementation_intention
    if (!i || (!i.behavior && !i.time && !i.location)) return null
    const parts = []
    if (i.behavior) parts.push(i.behavior)
    if (i.time) parts.push(`at ${i.time}`)
    if (i.location) parts.push(`in ${i.location}`)
    return parts.length ? `I will ${parts.join(' ')}` : null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e87722] border-t-transparent" />
        <p className="text-sm text-gray-500 mt-3">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Habits
        </h1>
        <p className="text-sm text-gray-500">
          Design habits with implementation intentions, stacking, and two-minute versions. Quick-add by name, or expand to add the full methodology.
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
            <p className="text-sm font-medium text-gray-900">New habit</p>
            <button type="button" onClick={resetCreateForm} className="text-sm text-gray-500 hover:underline">Cancel</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Habit name (required)</label>
            <input
              type="text"
              placeholder="e.g. Read 10 pages"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Identity (optional)</label>
            <select
              value={draftIdentityId ?? ''}
              onChange={(e) => setDraftIdentityId(e.target.value || null)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
            >
              <option value="">Unlinked</option>
              {identities.map((idn) => (
                <option key={idn.id} value={idn.id}>{idn.statement}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowDesignSection((v) => !v)}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              {showDesignSection ? 'Hide design' : 'Design this habit'}
            </button>
            {showDesignSection && (
              <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                <p className="text-xs font-medium text-gray-700">Implementation intention</p>
                <input type="text" placeholder="Behavior (e.g. read 10 pages)" value={draftBehavior} onChange={(e) => setDraftBehavior(e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                <input type="text" placeholder="Time (e.g. 7pm)" value={draftTime} onChange={(e) => setDraftTime(e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                <input type="text" placeholder="Location (e.g. in bed)" value={draftLocation} onChange={(e) => setDraftLocation(e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                <p className="text-xs font-medium text-gray-700 mt-2">Stack after (optional)</p>
                <select value={draftStackScorecardId ?? ''} onChange={(e) => { setDraftStackScorecardId(e.target.value || null); setDraftStackHabitId(null); }} className="w-full h-9 px-3 rounded border border-gray-200 text-sm">
                  <option value="">No scorecard anchor</option>
                  {scorecardEntries.map((e) => (
                    <option key={e.id} value={e.id}>{e.habit_name}</option>
                  ))}
                </select>
                <select value={draftStackHabitId ?? ''} onChange={(e) => { setDraftStackHabitId(e.target.value || null); setDraftStackScorecardId(null); }} className="w-full h-9 px-3 rounded border border-gray-200 text-sm">
                  <option value="">No habit anchor</option>
                  {activeHabits.filter((h) => h.id !== editingId).map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <p className="text-xs font-medium text-gray-700">Temptation bundle (optional)</p>
                <input type="text" placeholder="After this habit, I get to…" value={draftTemptationBundle} onChange={(e) => setDraftTemptationBundle(e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                <p className="text-xs font-medium text-gray-700">Two-minute version (optional)</p>
                <input type="text" placeholder="e.g. Read one page" value={draftTwoMinute} onChange={(e) => setDraftTwoMinute(e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={createHabit}
            disabled={!draftName.trim()}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50"
          >
            Create habit
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="text-sm font-medium text-[#e87722] hover:underline"
        >
          + Add habit
        </button>
      )}

      {activeHabits.length === 0 && !showAddForm ? (
        <div className="rounded-[20px] bg-white shadow-xl border border-black/6 p-8 text-center">
          <p className="text-gray-600 mb-6">
            Add habits to track. Start with a name and optional identity; you can add implementation intentions and stacking later.
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
          >
            Add your first habit
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {identities.map((idn) => {
            const groupHabits = habitsByIdentity.get(idn.id) ?? []
            if (groupHabits.length === 0) return null
            return (
              <div key={idn.id}>
                <h2 className="text-sm font-semibold text-gray-900 mb-2">{idn.statement}</h2>
                <ul className="space-y-3">
                  {groupHabits.map((h) => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      identityStatement={idn.statement}
                      scorecardEntries={scorecardEntries}
                      habits={habits}
                      getStackLabel={getStackLabel}
                      intentionString={intentionString}
                      hasDesignFields={hasDesignFields(h)}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      onUpdate={(updates) => updateHabit(h.id, updates)}
                      onArchive={() => archiveHabit(h.id)}
                      onDelete={() => deleteHabit(h.id)}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
          {(habitsByIdentity.get(null) ?? []).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Unlinked Habits</h2>
              <ul className="space-y-3">
                {(habitsByIdentity.get(null) ?? []).map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    identityStatement={null}
                    scorecardEntries={scorecardEntries}
                    habits={habits}
                    getStackLabel={getStackLabel}
                    intentionString={intentionString}
                    hasDesignFields={hasDesignFields(h)}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    onUpdate={(updates) => updateHabit(h.id, updates)}
                    onArchive={() => archiveHabit(h.id)}
                    onDelete={() => deleteHabit(h.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {archivedHabits.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setArchivedOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <span className={archivedOpen ? 'rotate-90' : ''}>→</span>
                Archived ({archivedHabits.length})
              </button>
              {archivedOpen && (
                <ul className="mt-2 space-y-2">
                  {archivedHabits.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      <span>{h.name}</span>
                      <button type="button" onClick={() => restoreHabit(h.id)} className="text-[#e87722] hover:underline text-xs">Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface HabitCardProps {
  habit: Habit
  identityStatement: string | null
  scorecardEntries: ScorecardAnchor[]
  habits: Habit[]
  getStackLabel: (h: Habit) => string | null
  intentionString: (h: Habit) => string | null
  hasDesignFields: boolean
  editingId: string | null
  setEditingId: (id: string | null) => void
  onUpdate: (updates: Partial<Habit>) => void
  onArchive: () => void
  onDelete: () => void
}

function HabitCard({
  habit,
  identityStatement,
  getStackLabel,
  intentionString,
  hasDesignFields,
  editingId,
  setEditingId,
  onUpdate,
  onArchive,
  onDelete,
}: HabitCardProps) {
  const [editName, setEditName] = useState(habit.name)
  const [editIntentionBehavior, setEditIntentionBehavior] = useState(habit.implementation_intention?.behavior ?? '')
  const [editIntentionTime, setEditIntentionTime] = useState(habit.implementation_intention?.time ?? '')
  const [editIntentionLocation, setEditIntentionLocation] = useState(habit.implementation_intention?.location ?? '')
  const [editTwoMinute, setEditTwoMinute] = useState(habit.two_minute_version ?? '')
  const [editTemptation, setEditTemptation] = useState(habit.temptation_bundle ?? '')
  const isEditing = editingId === habit.id

  const saveEdit = () => {
    const intention = (editIntentionBehavior.trim() || editIntentionTime.trim() || editIntentionLocation.trim())
      ? { behavior: editIntentionBehavior.trim().slice(0, 200) || undefined, time: editIntentionTime.trim().slice(0, 100) || undefined, location: editIntentionLocation.trim().slice(0, 200) || undefined }
      : null
    onUpdate({
      name: editName.trim().slice(0, 200) || habit.name,
      implementation_intention: intention,
      two_minute_version: editTwoMinute.trim().slice(0, 200) || null,
      temptation_bundle: editTemptation.trim().slice(0, 500) || null,
    })
  }

  const stackLabel = getStackLabel(habit)
  const intention = intentionString(habit)

  return (
    <li className="rounded-xl bg-white border border-gray-200/80 p-4">
      {isEditing ? (
        <div className="space-y-3">
          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Implementation intention</p>
            <input placeholder="Behavior" value={editIntentionBehavior} onChange={(e) => setEditIntentionBehavior(e.target.value)} className="w-full h-9 px-3 rounded border text-sm mb-1" />
            <input placeholder="Time" value={editIntentionTime} onChange={(e) => setEditIntentionTime(e.target.value)} className="w-full h-9 px-3 rounded border text-sm mb-1" />
            <input placeholder="Location" value={editIntentionLocation} onChange={(e) => setEditIntentionLocation(e.target.value)} className="w-full h-9 px-3 rounded border text-sm" />
          </div>
          <input placeholder="Two-minute version" value={editTwoMinute} onChange={(e) => setEditTwoMinute(e.target.value)} className="w-full h-9 px-3 rounded border text-sm" />
          <input placeholder="Temptation bundle" value={editTemptation} onChange={(e) => setEditTemptation(e.target.value)} className="w-full h-9 px-3 rounded border text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={saveEdit} className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium">Save</button>
            <button type="button" onClick={() => setEditingId(null)} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{habit.name}</p>
              {identityStatement && <p className="text-xs text-gray-500 mt-0.5">{identityStatement}</p>}
              {stackLabel && <p className="text-xs text-gray-600 mt-1">Stack: {stackLabel}</p>}
              {intention && <p className="text-xs text-gray-600 mt-0.5">{intention}</p>}
              {habit.two_minute_version && <p className="text-xs text-gray-600 mt-0.5">2-min: {habit.two_minute_version}</p>}
              {habit.temptation_bundle && <p className="text-xs text-gray-600 mt-0.5">Reward: {habit.temptation_bundle}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => setEditingId(habit.id)} className="text-gray-400 hover:text-gray-600 p-1 text-sm" aria-label="Edit">✎</button>
              <button type="button" onClick={onArchive} className="text-gray-400 hover:text-amber-600 p-1 text-sm" aria-label="Archive">Archive</button>
              <button type="button" onClick={onDelete} className="text-gray-400 hover:text-red-600 p-1 text-sm" aria-label="Delete">×</button>
            </div>
          </div>
          {!hasDesignFields && (
            <button type="button" onClick={() => setEditingId(habit.id)} className="mt-2 text-xs text-[#e87722] hover:underline">
              Design this habit
            </button>
          )}
        </>
      )}
    </li>
  )
}
