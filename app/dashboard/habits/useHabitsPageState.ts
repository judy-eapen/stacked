'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DesignBreak, DesignBuild } from '@/lib/db-types'
import { EMPTY_DESIGN_BREAK } from '@/components/DesignBreakForm'
import type { Habit, HabitToBreak, IdentityOption, ScorecardAnchor } from './types'
import { EMPTY_DESIGN_BUILD, isEmptyDesignBuild, trimDesignBuild } from './utils'

export function useHabitsPageState() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [habits, setHabits] = useState<Habit[]>([])
  const [identities, setIdentities] = useState<IdentityOption[]>([])
  const [scorecardEntries, setScorecardEntries] = useState<ScorecardAnchor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDesignSection, setShowDesignSection] = useState(false)
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
  const [habitFilter, setHabitFilter] = useState<'all' | 'reinforcing' | 'blocking'>('all')
  const [expandedCalendarHabitId, setExpandedCalendarHabitId] = useState<string | null>(null)
  const [calendarCompletions, setCalendarCompletions] = useState<Record<string, Set<string>>>({})
  const [calendarLoading, setCalendarLoading] = useState<string | null>(null)
  const [habitSharesByHabit, setHabitSharesByHabit] = useState<Record<string, { partner_id: string; display_name: string | null }[]>>({})

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [habitsRes, identitiesRes, scorecardRes, habitsToBreakRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).is('archived_at', null).order('sort_order', { ascending: true }),
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

  useEffect(() => {
    fetch('/api/partners', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setHabitSharesByHabit(d.habit_shares_by_habit ?? {}))
      .catch(() => {})
  }, [habits.length])

  useEffect(() => {
    if (!expandedCalendarHabitId) return
    if (calendarCompletions[expandedCalendarHabitId]) return
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 29)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)
    setCalendarLoading(expandedCalendarHabitId)
    fetch(`/api/habits/${expandedCalendarHabitId}/streaks?from=${fromStr}&to=${toStr}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const dates = (data.completions ?? [])
          .filter((c: { completed: boolean }) => c.completed)
          .map((c: { date: string }) => c.date)
        const set: Set<string> = new Set(dates)
        setCalendarCompletions((prev) => ({ ...prev, [expandedCalendarHabitId]: set }))
      })
      .catch(() => {})
      .finally(() => setCalendarLoading(null))
  }, [expandedCalendarHabitId, calendarCompletions])

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
    if (!user) {
      setAddingBlockerHabitId(null)
      return
    }
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

  const blockersByIdentity = useMemo(() => {
    const map = new Map<string, HabitToBreak[]>()
    identities.forEach((idn) => map.set(idn.id, []))
    habitsToBreak.forEach((h) => {
      const list = map.get(h.identity_id) ?? []
      list.push(h)
      map.set(h.identity_id, list)
    })
    return map
  }, [habitsToBreak, identities])

  const identityGroups = useMemo(() => {
    return identities.filter((idn) => {
      const reinforcing = (habitsByIdentity.get(idn.id) ?? []).length
      const blocking = (blockersByIdentity.get(idn.id) ?? []).length
      if (habitFilter === 'all') return reinforcing > 0 || blocking > 0
      if (habitFilter === 'reinforcing') return reinforcing > 0
      return blocking > 0
    })
  }, [identities, habitsByIdentity, blockersByIdentity, habitFilter])

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
    const isAddingAsBlocker = Boolean(addBlockerFor)
    const { data: inserted, error: err } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        identity_id: isAddingAsBlocker ? null : (draftIdentityId || null),
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
    if (isAddingAsBlocker && addBlockerFor) {
      const { error: breakErr } = await supabase
        .from('habits_to_break')
        .upsert({ user_id: user.id, identity_id: addBlockerFor, habit_id: inserted.id, name, design_break: null }, { onConflict: 'identity_id' })
      resetCreateForm()
      fetchAll()
      if (breakErr) setError(breakErr.message)
      else router.push(`/dashboard/identities/${addBlockerFor}?blockers=1`)
      return
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
      const e = scorecardEntries.find((entry) => entry.id === h.stack_anchor_scorecard_id)
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

  return {
    router,
    identityParam,
    modeParam,
    addBlockerFor,
    loading,
    error,
    setError,
    showAddForm,
    setShowAddForm,
    showDesignSection,
    setShowDesignSection,
    editingId,
    setEditingId,
    draftName,
    setDraftName,
    draftIdentityId,
    setDraftIdentityId,
    draftStackScorecardId,
    setDraftStackScorecardId,
    draftStackHabitId,
    setDraftStackHabitId,
    draftDesignBuild,
    setDraftDesignBuild,
    habitsToBreak,
    showBlockerForm,
    setShowBlockerForm,
    blockerDraftName,
    setBlockerDraftName,
    blockerDraftHabitId,
    setBlockerDraftHabitId,
    blockerDraftDesign,
    setBlockerDraftDesign,
    editingBlockerId,
    setEditingBlockerId,
    addingBlockerHabitId,
    habitFilter,
    setHabitFilter,
    expandedCalendarHabitId,
    setExpandedCalendarHabitId,
    calendarCompletions,
    calendarLoading,
    habitSharesByHabit,
    fetchAll,
    activeHabits,
    addBlockerForIdentity,
    unlinkedHabitsForBlocker,
    addAsBlockerForIdentity,
    habitsByIdentity,
    blockersByIdentity,
    identityGroups,
    activeCount,
    onStreakCount,
    identitiesWithHabitsCount,
    resetCreateForm,
    createHabit,
    updateHabit,
    deleteHabit,
    getStackLabel,
    intentionString,
    habits,
    identities,
    scorecardEntries,
  }
}
