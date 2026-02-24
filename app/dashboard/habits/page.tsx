'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DesignBuild } from '@/lib/db-types'
import { DesignBreakForm, EMPTY_DESIGN_BREAK, trimDesignBreak } from '@/components/DesignBreakForm'
import { StackChainView } from '@/components/stack-chain-view'
import type { DesignBreak } from '@/lib/db-types'
import { Search, Plus, Archive, Trash2, Bell, Users, FileSignature, Sparkles, Pencil, Calendar } from 'lucide-react'

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
  push_notification_enabled: boolean
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

interface HabitToBreak {
  id: string
  user_id: string
  identity_id: string
  habit_id: string | null
  name: string
  design_break: DesignBreak | null
  created_at: string
  updated_at: string
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
        <p className="text-[11px] text-gray-500 mt-0.5">Stacking: After [current habit], I will [new habit].</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">2. Make it attractive</p>
        <input placeholder="Pair with something you enjoy" value={d.attractive?.pair_with_enjoyment ?? ''} onChange={(e) => set('attractive', 'pair_with_enjoyment', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Reframe as identity-driven" value={d.attractive?.identity_reframe ?? ''} onChange={(e) => set('attractive', 'identity_reframe', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Temptation bundling" value={d.attractive?.temptation_bundling ?? ''} onChange={(e) => set('attractive', 'temptation_bundling', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
        <p className="text-[11px] text-gray-500 mt-0.5">Pair the habit with something you enjoy (e.g. podcast only while walking).</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">3. Make it easy</p>
        <input placeholder="Reduce friction" value={d.easy?.reduce_friction ?? ''} onChange={(e) => set('easy', 'reduce_friction', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="2-minute rule" value={d.easy?.two_minute_rule ?? ''} onChange={(e) => set('easy', 'two_minute_rule', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <p className="text-[11px] text-gray-500 mt-0.5">Start with a version that takes under 2 minutes so you can do it every day.</p>
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
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [draftStackScorecardId, setDraftStackScorecardId] = useState<string | null>(null)
  const [draftStackHabitId, setDraftStackHabitId] = useState<string | null>(null)
  const [draftDesignBuild, setDraftDesignBuild] = useState<DesignBuild>(() => ({ ...EMPTY_DESIGN_BUILD }))
  const [habitsToBreak, setHabitsToBreak] = useState<HabitToBreak[]>([])
  const [showBlockerForm, setShowBlockerForm] = useState(false)
  const [blockerDraftName, setBlockerDraftName] = useState('')
  const [blockerDraftHabitId, setBlockerDraftHabitId] = useState<string | null>(null)
  const [blockerDraftDesign, setBlockerDraftDesign] = useState<DesignBreak>(() => ({ ...EMPTY_DESIGN_BREAK }))
  const [editingBlockerId, setEditingBlockerId] = useState<string | null>(null)
  const [addingBlockerHabitId, setAddingBlockerHabitId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [habitsRes, archivedRes, identitiesRes, scorecardRes, habitsToBreakRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).is('archived_at', null).order('sort_order', { ascending: true }),
      supabase.from('habits').select('*').eq('user_id', user.id).not('archived_at', 'is', null).order('updated_at', { ascending: false }),
      supabase.from('identities').select('id, statement, sort_order').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('scorecard_entries').select('id, habit_name').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('habits_to_break').select('*').eq('user_id', user.id),
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
    if (habitsToBreakRes.error) setHabitsToBreak([])
    else setHabitsToBreak((habitsToBreakRes.data ?? []) as HabitToBreak[])
  }, [])

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  const identityParam = searchParams.get('identity')
  const modeParam = searchParams.get('mode')
  const newParam = searchParams.get('new')
  const addBlockerFor = searchParams.get('addBlockerFor')

  useEffect(() => {
    if (searchParams.get('add') === '1') setShowAddForm(true)
    if (identityParam) setDraftIdentityId(identityParam)
    if (newParam === '1' || (identityParam && modeParam === 'reinforce')) setShowAddForm(true)
  }, [searchParams, identityParam, modeParam, newParam])

  const activeHabits = habits.filter((h) => h.is_active)
  const addBlockerForIdentity = addBlockerFor ? identities.find((i) => i.id === addBlockerFor) : null
  const unlinkedHabitsForBlocker = activeHabits.filter((h) => h.identity_id == null)
  const addAsBlockerForIdentity = async (habitId: string) => {
    if (!addBlockerFor) return
    const habit = activeHabits.find((h) => h.id === habitId)
    if (!habit) return
    setAddingBlockerHabitId(habitId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAddingBlockerHabitId(null); return }
    const name = habit.name.trim().slice(0, 200)
    const { error: err } = await supabase
      .from('habits_to_break')
      .upsert({ user_id: user.id, identity_id: addBlockerFor, habit_id: habitId, name, design_break: null }, { onConflict: 'identity_id' })
    setAddingBlockerHabitId(null)
    if (err) setError(err.message)
    else router.push(`/dashboard/identities/${addBlockerFor}?blockers=1`)
  }
  const habitsByIdentity = useMemo(() => {
    const map = new Map<string | null, Habit[]>()
    map.set(null, [])
    identities.forEach((idn) => map.set(idn.id, []))
    activeHabits.forEach((h) => {
      const key = h.identity_id ?? null
      const list = map.get(key) ?? []
      list.push(h)
      map.set(key, list)
    })
    return map
  }, [activeHabits, identities])

  const matchesSearch = useCallback((h: Habit) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      h.name.toLowerCase().includes(q) ||
      (h.two_minute_version?.toLowerCase().includes(q) ?? false)
    )
  }, [searchQuery])

  const activeCount = activeHabits.length
  const onStreakCount = activeHabits.filter((h) => h.current_streak > 0).length
  const identitiesWithHabitsCount = identities.filter(
    (idn) => (habitsByIdentity.get(idn.id) ?? []).length > 0
  ).length

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
    const { data: inserted, error: err } = await supabase
      .from('habits')
      .insert({
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
      .select('id')
      .single()
    if (err) {
      setError(err.message)
      return
    }
    if (inserted?.id) {
      fetch('/api/calendar/sync-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: inserted.id }),
      }).catch(() => {})
    }
    const identityForRedirect = draftIdentityId || identityParam || null
    resetCreateForm()
    fetchAll()
    if (identityForRedirect) {
      router.push(`/dashboard/identities/${identityForRedirect}`)
    }
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
      fetch('/api/calendar/sync-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId }),
      }).catch(() => {})
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
    await fetch('/api/calendar/sync-habit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: id, remove: true }),
    }).catch(() => {})
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
      {/* Header: title, subtitle, + Add habit button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Habits
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-0.5">
            Design habits with implementation intentions, stacking, and two-minute versions. Expand any habit to see its full 4 Laws design.
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add habit
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {addBlockerFor && addBlockerForIdentity && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="font-body text-sm font-medium text-foreground">
            Pick a habit to add as a blocker for &ldquo;{addBlockerForIdentity.statement}&rdquo;
          </p>
          <p className="font-body text-xs text-muted-foreground">
            Only unlinked habits (not tied to an identity) can be blockers. Select one below, then you&rsquo;ll return to the identity.
          </p>
          <Link
            href={`/dashboard/identities/${addBlockerFor}`}
            className="inline-flex items-center font-body text-sm font-medium text-primary hover:underline"
          >
            ← Back to identity
          </Link>
          {unlinkedHabitsForBlocker.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">
              No unlinked habits. Create a habit without an identity first, or unlink one from the Habits page.
            </p>
          ) : (
            <ul className="space-y-2">
              {unlinkedHabitsForBlocker.map((habit) => (
                <li key={habit.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                  <span className="font-body text-sm text-foreground">{habit.name}</span>
                  <button
                    type="button"
                    onClick={() => addAsBlockerForIdentity(habit.id)}
                    disabled={addingBlockerHabitId === habit.id}
                    className="font-body text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {addingBlockerHabitId === habit.id ? 'Adding…' : 'Add as blocker'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Summary stats: ACTIVE, ON STREAK, IDENTITIES */}
      {activeHabits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 font-body text-xs font-medium text-red-800">
            {activeCount} ACTIVE
          </span>
          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 font-body text-xs font-medium text-green-800">
            {onStreakCount} ON STREAK
          </span>
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-body text-xs font-medium text-blue-800">
            {identitiesWithHabitsCount} IDENTITIES
          </span>
        </div>
      )}

      {/* Search */}
      {activeHabits.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search habits…"
            className="font-body w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search habits by name"
          />
        </div>
      )}

      <p className="font-body text-xs text-muted-foreground">
        4 Laws (obvious, attractive, easy, satisfying) and stacking (after [X], I will [Y]) from Atomic Habits.
      </p>

      {modeParam === 'fix' && identityParam && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Blockers for this identity</h2>
          <p className="text-sm text-gray-500">Habits that undermine this identity. Pick one from your habits or add by name, then design how to break it.</p>
          {habitsToBreak.filter((h) => h.identity_id === identityParam).length === 0 && !showBlockerForm && (
            <p className="text-sm text-gray-500">No blockers linked yet.</p>
          )}
          <ul className="space-y-2">
            {habitsToBreak.filter((h) => h.identity_id === identityParam).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                {editingBlockerId === h.id ? (
                  <div className="flex-1 space-y-2">
                    <input value={blockerDraftName} onChange={(e) => setBlockerDraftName(e.target.value)} placeholder="Habit name" className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                    <DesignBreakForm value={blockerDraftDesign} onChange={setBlockerDraftDesign} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const name = blockerDraftName.trim().slice(0, 200)
                          if (!name) return
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) return
                          const db = trimDesignBreak(blockerDraftDesign)
                          const { error: err } = await supabase.from('habits_to_break').update({ name, design_break: db }).eq('id', h.id).eq('user_id', user.id)
                          if (err) setError(err.message)
                          else { setEditingBlockerId(null); fetchAll(); }
                        }}
                        className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingBlockerId(null)} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">{h.name}</span>
                    <button type="button" onClick={() => { setEditingBlockerId(h.id); setBlockerDraftName(h.name); setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK, ...h.design_break }); }} className="text-[#e87722] hover:underline text-xs">Edit</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {showBlockerForm ? (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">Add habit to break</p>
              <input value={blockerDraftName} onChange={(e) => setBlockerDraftName(e.target.value)} placeholder="Habit name" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
              <DesignBreakForm value={blockerDraftDesign} onChange={setBlockerDraftDesign} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const name = blockerDraftName.trim().slice(0, 200)
                    if (!name) return
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const db = trimDesignBreak(blockerDraftDesign)
                    const { error: err } = await supabase.from('habits_to_break').upsert({ user_id: user.id, identity_id: identityParam, habit_id: blockerDraftHabitId || null, name, design_break: db }, { onConflict: 'identity_id' })
                    if (err) setError(err.message)
                    else { setShowBlockerForm(false); setBlockerDraftName(''); setBlockerDraftHabitId(null); setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK }); fetchAll(); }
                  }}
                  disabled={!blockerDraftName.trim()}
                  className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
                >
                  Save
                </button>
                <button type="button" onClick={() => { setShowBlockerForm(false); setBlockerDraftName(''); setBlockerDraftHabitId(null); setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK }); }} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Pick from existing habits</p>
              <ul className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {activeHabits
                  .filter((habit) => habit.identity_id == null)
                  .map((habit) => (
                    <li key={habit.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-gray-50">
                      <span className="text-sm text-gray-900">{habit.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBlockerDraftName(habit.name)
                          setBlockerDraftHabitId(habit.id)
                          setShowBlockerForm(true)
                        }}
                        className="text-xs font-medium text-[#e87722] hover:underline"
                      >
                        Add as blocker
                      </button>
                    </li>
                  ))}
              </ul>
              {activeHabits.filter((h) => h.identity_id == null).length === 0 && (
                <p className="text-sm text-gray-500">
                  {activeHabits.length === 0 ? 'No habits yet. Create one first, then you can add it as a blocker here.' : 'No unlinked habits. Only habits not linked as reinforcing any identity can be added as blockers; add a blocker by name below.'}
                </p>
              )}
              <p className="text-xs text-gray-500">Or add by name:</p>
              <button type="button" onClick={() => { setBlockerDraftName(''); setBlockerDraftHabitId(null); setShowBlockerForm(true); }} className="text-sm font-medium text-[#e87722] hover:underline">
                + Add habit to break (enter name)
              </button>
            </div>
          )}
        </div>
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
      ) : null}

      {activeHabits.length === 0 && !showAddForm ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="font-body text-muted-foreground mb-6">
            Add habits to track. Start with a name and optional identity; you can add implementation intentions and stacking later.
          </p>
          <Link
            href="/dashboard/habits?add=1"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-body font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add your first habit
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {identities.map((idn) => {
            const groupHabits = (habitsByIdentity.get(idn.id) ?? []).filter(matchesSearch)
            if (groupHabits.length === 0) return null
            return (
              <div key={idn.id}>
                <h2 className="font-heading text-sm font-semibold text-foreground mb-2">
                  {idn.statement}
                  <span className="font-body text-muted-foreground font-normal ml-1">
                    ({groupHabits.length} habit{groupHabits.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupHabits.map((h) => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      identityStatement={idn.statement}
                      identities={identities}
                      linkToIdentityId={null}
                      linkToIdentityStatement={null}
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
                </div>
              </div>
            )
          })}
          {(habitsByIdentity.get(null) ?? []).filter(matchesSearch).length > 0 && (
            <div>
              <h2 className="font-heading text-sm font-semibold text-foreground mb-2">
                Unlinked Habits
                <span className="font-body text-muted-foreground font-normal ml-1">
                  ({(habitsByIdentity.get(null) ?? []).filter(matchesSearch).length} habit{(habitsByIdentity.get(null) ?? []).filter(matchesSearch).length !== 1 ? 's' : ''})
                </span>
              </h2>
              {identityParam && modeParam === 'reinforce' && identities.find((idn) => idn.id === identityParam) && (
                <p className="font-body text-xs text-muted-foreground mb-2">Click &quot;Add to identity&quot; on a habit below to link it to <strong>{identities.find((idn) => idn.id === identityParam)?.statement}</strong>.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(habitsByIdentity.get(null) ?? []).filter(matchesSearch).map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    identityStatement={null}
                    identities={identities}
                    linkToIdentityId={identityParam && modeParam === 'reinforce' ? identityParam : null}
                    linkToIdentityStatement={identityParam && modeParam === 'reinforce' ? identities.find((idn) => idn.id === identityParam)?.statement ?? null : null}
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
              </div>
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
  identities: IdentityOption[]
  linkToIdentityId: string | null
  linkToIdentityStatement: string | null
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
  identities,
  linkToIdentityId,
  linkToIdentityStatement,
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
  const [editIdentityId, setEditIdentityId] = useState<string | null>(habit.identity_id)
  const prevEditingRef = useRef(false)
  useEffect(() => {
    if (editingId === habit.id && !prevEditingRef.current) {
      setEditName(habit.name)
      setEditIdentityId(habit.identity_id)
    }
    prevEditingRef.current = editingId === habit.id
  }, [editingId, habit.id, habit.name, habit.identity_id])
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
    const twoMinRaw = (db?.easy?.two_minute_rule?.trim() ?? habit.two_minute_version ?? '').trim().slice(0, 200)
    const temptationRaw = (db?.attractive?.temptation_bundling?.trim() ?? habit.temptation_bundle ?? '').trim().slice(0, 500)
    onUpdate({
      name: editName.trim().slice(0, 200) || habit.name,
      identity_id: editIdentityId || null,
      design_build: isEmptyDesignBuild(db ?? null) ? null : db,
      implementation_intention: intentionFromBuild ? { behavior: intentionFromBuild.slice(0, 200), time: undefined, location: undefined } : habit.implementation_intention,
      two_minute_version: twoMinRaw || null,
      temptation_bundle: temptationRaw || null,
    })
  }

  const stackLabel = getStackLabel(habit)
  const intention = intentionString(habit)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {isEditing ? (
        <div className="space-y-3">
          <label className="font-body block text-xs font-medium text-muted-foreground">Habit name</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-body w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground" />
          <div>
            <label className="font-body block text-xs font-medium text-muted-foreground mb-1">Identity</label>
            <select
              value={editIdentityId ?? ''}
              onChange={(e) => setEditIdentityId(e.target.value || null)}
              className="font-body w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Unlinked</option>
              {identities.map((idn) => (
                <option key={idn.id} value={idn.id}>{idn.statement}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={habit.is_shared}
              onChange={(e) => onUpdate({ is_shared: e.target.checked })}
              className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
            />
            <span className="text-xs font-medium text-gray-700">Share with partners</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={habit.push_notification_enabled ?? false}
              onChange={(e) => onUpdate({ push_notification_enabled: e.target.checked })}
              className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
            />
            <span className="text-xs font-medium text-gray-700">Push reminders</span>
          </label>
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
            <div className="min-w-0 flex-1">
              <p className="font-heading font-medium text-foreground">{habit.name}</p>
              {identityStatement && <p className="font-body text-xs text-muted-foreground mt-0.5">{identityStatement}</p>}
              {(habit.current_streak > 0) && (
                <p className="font-body text-xs text-muted-foreground mt-0.5">{habit.current_streak} day streak</p>
              )}
              {stackLabel && <StackChainView anchorLabel={stackLabel.replace(/^After "/, '').replace(/"$/, '')} habitName={habit.name} className="mt-1" />}
              {intention && <p className="font-body text-xs text-muted-foreground mt-0.5">{intention}</p>}
              {habit.two_minute_version && <p className="font-body text-xs text-muted-foreground mt-0.5">2-min: {habit.two_minute_version}</p>}
              {habit.temptation_bundle && <p className="font-body text-xs text-muted-foreground mt-0.5">Reward: {habit.temptation_bundle}</p>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={onArchive} className="p-1.5 text-muted-foreground hover:text-amber-600 rounded-md hover:bg-card" aria-label="Archive">
                <Archive className="h-4 w-4" />
              </button>
              <button type="button" onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-card" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <Link href={`/dashboard/habits/${habit.id}`} className="font-body inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary" aria-label="View calendar">
              <Calendar className="h-3.5 w-3.5" /> View calendar
            </Link>
            <button type="button" onClick={() => setEditingId(habit.id)} className="font-body inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ is_shared: !habit.is_shared })}
              className={`font-body inline-flex items-center gap-1 text-xs font-medium ${habit.is_shared ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Users className="h-3.5 w-3.5" /> {habit.is_shared ? 'Shared' : 'Share'}
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ push_notification_enabled: !(habit.push_notification_enabled ?? false) })}
              className={`font-body inline-flex items-center gap-1 text-xs font-medium ${habit.push_notification_enabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Bell className="h-3.5 w-3.5" /> {habit.push_notification_enabled ? 'Reminders on' : 'Reminders'}
            </button>
            <Link
              href={`/dashboard/habits/${habit.id}/contract`}
              className="font-body inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
            >
              <FileSignature className="h-3.5 w-3.5" /> Contract
            </Link>
          </div>
          {linkToIdentityId && linkToIdentityStatement && (
            <button
              type="button"
              onClick={() => onUpdate({ identity_id: linkToIdentityId })}
              className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Add to identity
            </button>
          )}
          {!hasDesignFields && (
            <button type="button" onClick={() => setEditingId(habit.id)} className="mt-2 font-body inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Sparkles className="h-3.5 w-3.5" /> Design this habit
            </button>
          )}
        </>
      )}
    </div>
  )
}
