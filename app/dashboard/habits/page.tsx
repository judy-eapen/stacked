'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DesignBuild } from '@/lib/db-types'

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
  design_build: DesignBuild | null
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

const EMPTY_DESIGN_BUILD: DesignBuild = {
  obvious: { clear_cue: '', visible_trigger: '', implementation_intention: '' },
  attractive: { pair_with_enjoyment: '', identity_reframe: '', temptation_bundling: '' },
  easy: { reduce_friction: '', two_minute_rule: '', environment_design: '' },
  satisfying: { immediate_reward: '', track_streak: '', celebrate_completion: '' },
}

function isEmptyDesignBuild(d: DesignBuild | null | undefined): boolean {
  if (!d) return true
  const keys = ['obvious', 'attractive', 'easy', 'satisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      for (const v of Object.values(section)) {
        if (typeof v === 'string' && v.trim()) return false
      }
    }
  }
  return true
}

function trimDesignBuild(d: DesignBuild | null | undefined): DesignBuild | null {
  if (!d) return null
  const out: DesignBuild = {}
  const keys = ['obvious', 'attractive', 'easy', 'satisfying'] as const
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

function DesignBuildForm({ value, onChange }: { value: DesignBuild; onChange: (v: DesignBuild) => void }) {
  const d = {
    obvious: { ...EMPTY_DESIGN_BUILD.obvious, ...value?.obvious },
    attractive: { ...EMPTY_DESIGN_BUILD.attractive, ...value?.attractive },
    easy: { ...EMPTY_DESIGN_BUILD.easy, ...value?.easy },
    satisfying: { ...EMPTY_DESIGN_BUILD.satisfying, ...value?.satisfying },
  }
  const set = (law: keyof DesignBuild, field: string, val: string) => {
    onChange({
      ...value,
      [law]: { ...d[law], [field]: val },
    })
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">1. Make it obvious</p>
        <input placeholder="Clear cue" value={d.obvious?.clear_cue ?? ''} onChange={(e) => set('obvious', 'clear_cue', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Visible trigger" value={d.obvious?.visible_trigger ?? ''} onChange={(e) => set('obvious', 'visible_trigger', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Implementation intention (e.g. After I pour coffee, I journal.)" value={d.obvious?.implementation_intention ?? ''} onChange={(e) => set('obvious', 'implementation_intention', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">2. Make it attractive</p>
        <input placeholder="Pair with something you enjoy" value={d.attractive?.pair_with_enjoyment ?? ''} onChange={(e) => set('attractive', 'pair_with_enjoyment', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Reframe as identity-driven" value={d.attractive?.identity_reframe ?? ''} onChange={(e) => set('attractive', 'identity_reframe', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Temptation bundling" value={d.attractive?.temptation_bundling ?? ''} onChange={(e) => set('attractive', 'temptation_bundling', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">3. Make it easy</p>
        <input placeholder="Reduce friction" value={d.easy?.reduce_friction ?? ''} onChange={(e) => set('easy', 'reduce_friction', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="2-minute rule" value={d.easy?.two_minute_rule ?? ''} onChange={(e) => set('easy', 'two_minute_rule', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Environment design" value={d.easy?.environment_design ?? ''} onChange={(e) => set('easy', 'environment_design', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">4. Make it satisfying</p>
        <input placeholder="Immediate reward" value={d.satisfying?.immediate_reward ?? ''} onChange={(e) => set('satisfying', 'immediate_reward', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Track streak" value={d.satisfying?.track_streak ?? ''} onChange={(e) => set('satisfying', 'track_streak', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Celebrate completion" value={d.satisfying?.celebrate_completion ?? ''} onChange={(e) => set('satisfying', 'celebrate_completion', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
    </div>
  )
}

function hasDesignFields(h: Habit): boolean {
  if (!isEmptyDesignBuild(h.design_build ?? null)) return true
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
  const searchParams = useSearchParams()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDesignSection, setShowDesignSection] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [draftName, setDraftName] = useState('')
  const [draftIdentityId, setDraftIdentityId] = useState<string | null>(null)
  const [draftStackScorecardId, setDraftStackScorecardId] = useState<string | null>(null)
  const [draftStackHabitId, setDraftStackHabitId] = useState<string | null>(null)
  const [draftDesignBuild, setDraftDesignBuild] = useState<DesignBuild>(() => ({ ...EMPTY_DESIGN_BUILD }))

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

  useEffect(() => {
    if (searchParams.get('add') === '1') setShowAddForm(true)
  }, [searchParams])

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
    setDraftStackScorecardId(null)
    setDraftStackHabitId(null)
    setDraftDesignBuild({ ...EMPTY_DESIGN_BUILD })
    setShowDesignSection(false)
    setShowAddForm(false)
  }

  const createHabit = async () => {
    const name = draftName.trim().slice(0, 200)
    if (!name) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const db = trimDesignBuild(draftDesignBuild)
    const intentionFromBuild = db?.obvious?.implementation_intention?.trim()
    const intention = intentionFromBuild
      ? { behavior: intentionFromBuild.slice(0, 200), time: undefined, location: undefined }
      : null
    const twoMinFromBuild = db?.easy?.two_minute_rule?.trim()
    const temptationFromBuild = db?.attractive?.temptation_bundling?.trim()
    const onlyOneStack = draftStackScorecardId ? { stack_anchor_scorecard_id: draftStackScorecardId, stack_anchor_habit_id: null } : draftStackHabitId ? { stack_anchor_scorecard_id: null, stack_anchor_habit_id: draftStackHabitId } : {}
    const { error: err } = await supabase.from('habits').insert({
      user_id: user.id,
      identity_id: draftIdentityId || null,
      name,
      two_minute_version: twoMinFromBuild?.slice(0, 200) || null,
      implementation_intention: intention,
      temptation_bundle: temptationFromBuild?.slice(0, 500) || null,
      design_build: isEmptyDesignBuild(db ?? null) ? null : db,
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
              <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">4 laws: build this habit</p>
                <DesignBuildForm
                  value={draftDesignBuild}
                  onChange={setDraftDesignBuild}
                />
                <p className="text-xs font-medium text-gray-700 mt-2 pt-2 border-t border-gray-200">Stack after (optional)</p>
                <select value={draftStackScorecardId ?? ''} onChange={(e) => { setDraftStackScorecardId(e.target.value || null); setDraftStackHabitId(null); }} className="w-full h-9 px-3 rounded border border-gray-200 text-sm">
                  <option value="">No scorecard anchor</option>
                  {scorecardEntries.map((e) => (
                    <option key={e.id} value={e.id}>{e.habit_name}</option>
                  ))}
                </select>
                <select value={draftStackHabitId ?? ''} onChange={(e) => { setDraftStackHabitId(e.target.value || null); setDraftStackScorecardId(null); }} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mt-1">
                  <option value="">No habit anchor</option>
                  {activeHabits.filter((h) => h.id !== editingId).map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
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
          <Link
            href="/dashboard/habits?add=1"
            className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
          >
            Add your first habit
          </Link>
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
  const [editDesignBuild, setEditDesignBuild] = useState<DesignBuild>(() => ({
    ...EMPTY_DESIGN_BUILD,
    ...habit.design_build,
    obvious: { ...EMPTY_DESIGN_BUILD.obvious, ...habit.design_build?.obvious },
    attractive: { ...EMPTY_DESIGN_BUILD.attractive, ...habit.design_build?.attractive },
    easy: { ...EMPTY_DESIGN_BUILD.easy, ...habit.design_build?.easy },
    satisfying: { ...EMPTY_DESIGN_BUILD.satisfying, ...habit.design_build?.satisfying },
  }))
  const isEditing = editingId === habit.id

  const saveEdit = () => {
    const db = trimDesignBuild(editDesignBuild)
    const intentionFromBuild = db?.obvious?.implementation_intention?.trim()
    onUpdate({
      name: editName.trim().slice(0, 200) || habit.name,
      design_build: isEmptyDesignBuild(db ?? null) ? null : db,
      implementation_intention: intentionFromBuild ? { behavior: intentionFromBuild.slice(0, 200), time: undefined, location: undefined } : habit.implementation_intention,
      two_minute_version: (db?.easy?.two_minute_rule?.trim()?.slice(0, 200)) ?? habit.two_minute_version,
      temptation_bundle: (db?.attractive?.temptation_bundling?.trim()?.slice(0, 500)) ?? habit.temptation_bundle,
    })
  }

  const stackLabel = getStackLabel(habit)
  const intention = intentionString(habit)

  return (
    <li className="rounded-xl bg-white border border-gray-200/80 p-4">
      {isEditing ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-700">Habit name</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">4 laws: build this habit</p>
            <DesignBuildForm value={editDesignBuild} onChange={setEditDesignBuild} />
          </div>
          <div className="flex gap-2 pt-2">
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
