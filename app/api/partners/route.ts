import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logWarn } from '@/lib/logger'
import { toDateString } from '@/lib/streaks'

export const dynamic = 'force-dynamic'

function getWeekStart(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

/** List current user's accepted partners, pending invites, shared habits summary for dashboard. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const includeDashboard = url.searchParams.get('dashboard') === '1'

  const { data: rows, error } = await supabase
    .from('partnerships')
    .select('id, user_id, partner_id, accepted_at')
    .eq('status', 'accepted')
    .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const acceptedRows = rows ?? []
  const otherIds = acceptedRows.map((r) => (r.user_id === user.id ? r.partner_id : r.user_id))

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url')
    .in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000'])

  const profileMap = (profiles ?? []).reduce(
    (acc: Record<string, { display_name: string | null; email: string | null; avatar_url: string | null }>, p) => {
      acc[p.id] = {
        display_name: (p.display_name ?? '').trim() || null,
        email: (p.email ?? '').trim() || null,
        avatar_url: p.avatar_url ?? null,
      }
      return acc
    },
    {}
  )

  const partnersRaw = acceptedRows.map((r) => {
    const otherId = r.user_id === user.id ? r.partner_id : r.user_id
    const p = profileMap[otherId]
    return {
      partnership_id: r.id,
      partner_id: otherId,
      display_name: p?.display_name ?? null,
      email: p?.email ?? null,
      avatar_url: p?.avatar_url ?? null,
      accepted_at: r.accepted_at ?? null,
    }
  })
  const seenPartnerIds = new Set<string>()
  const partners = partnersRaw.filter((p) => {
    if (seenPartnerIds.has(p.partner_id)) return false
    seenPartnerIds.add(p.partner_id)
    return true
  })

  let my_habits: { id: string; name: string }[] = []
  const shared_habit_ids_by_partner: Record<string, string[]> = {}
  let habit_shares_by_habit: Record<string, { partner_id: string; display_name: string | null }[]> = {}

  const { data: myHabitRows } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
  my_habits = (myHabitRows ?? []).map((h: { id: string; name: string }) => ({ id: h.id, name: h.name }))

  try {
    const { data: shareRows } = await supabase
      .from('habit_partner_shares')
      .select('habit_id, partner_id')
      .in('habit_id', my_habits.map((h) => h.id))
    for (const row of shareRows ?? []) {
      const pid = row.partner_id
      if (!shared_habit_ids_by_partner[pid]) shared_habit_ids_by_partner[pid] = []
      if (!shared_habit_ids_by_partner[pid].includes(row.habit_id)) shared_habit_ids_by_partner[pid].push(row.habit_id)
      const hid = row.habit_id
      if (!habit_shares_by_habit[hid]) habit_shares_by_habit[hid] = []
      const prof = profileMap[pid]
      habit_shares_by_habit[hid].push({ partner_id: pid, display_name: prof?.display_name ?? null })
    }
  } catch (error) {
    logWarn('Failed to load habit_partner_shares; continuing without share metadata', {
      user_id: user.id,
      route: '/api/partners',
      detail: error instanceof Error ? error.message : String(error),
    })
  }

  const partnersWithSharedIds = partners.map((p) => ({
    ...p,
    shared_habit_ids: shared_habit_ids_by_partner[p.partner_id] ?? [],
  }))

  let pending_invites: { id: string; created_at: string; invite_url: string }[] = []
  let shared_habits_count = 0
  let shared_habits: {
    id: string
    name: string
    identity: string | null
    current_streak: number
    completed_today: boolean
    week_completion: boolean[]
  }[] = []
  let last_active_by_partner: Record<string, string> = {}

  if (includeDashboard) {
    const { data: pendingRows } = await supabase
      .from('partnerships')
      .select('id, created_at, invite_token')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .is('partner_id', null)

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      ''
    pending_invites = (pendingRows ?? []).map((r: { id: string; created_at: string; invite_token: string }) => ({
      id: r.id,
      created_at: r.created_at,
      invite_url: origin ? `${origin}/invite/${r.invite_token}` : `/invite/${r.invite_token}`,
    }))

    if (otherIds.length > 0) {
      const { data: lastActiveRows } = await supabase
        .from('habit_completions')
        .select('user_id, completed_date')
        .in('user_id', otherIds)
        .eq('completed', true)
        .order('completed_date', { ascending: false })
      const byUser: Record<string, string> = {}
      for (const row of lastActiveRows ?? []) {
        if (byUser[row.user_id] == null) byUser[row.user_id] = row.completed_date
      }
      last_active_by_partner = byUser
    }

    const todayStr = toDateString(new Date())
    const weekStart = getWeekStart(new Date())
    const weekEnd = new Date(weekStart + 'T12:00:00')
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = toDateString(weekEnd)

    const sharedHabitIdsFromTable =
      Object.keys(habit_shares_by_habit).length > 0 ? Object.keys(habit_shares_by_habit) : []
    const { data: sharedHabitRows } = await supabase
      .from('habits')
      .select('id, name, identity_id, current_streak, identities(statement)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('archived_at', null)
      .in('id', sharedHabitIdsFromTable.length > 0 ? sharedHabitIdsFromTable : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order', { ascending: true })
    shared_habits_count = sharedHabitRows?.length ?? 0

    if (sharedHabitRows && sharedHabitRows.length > 0) {
      const habitIds = sharedHabitRows.map((h: { id: string }) => h.id)
      const { data: compRows } = await supabase
        .from('habit_completions')
        .select('habit_id, completed_date, completed')
        .eq('user_id', user.id)
        .in('habit_id', habitIds)
        .gte('completed_date', weekStart)
        .lte('completed_date', weekEndStr)

      const completedSetByHabit: Record<string, Set<string>> = {}
      for (const id of habitIds) completedSetByHabit[id] = new Set()
      for (const row of compRows ?? []) {
        if (row.completed && completedSetByHabit[row.habit_id])
          completedSetByHabit[row.habit_id].add(row.completed_date)
      }

      const weekDates: string[] = []
      const d = new Date(weekStart + 'T12:00:00')
      for (let i = 0; i < 7; i++) {
        weekDates.push(toDateString(d))
        d.setDate(d.getDate() + 1)
      }

      shared_habits = sharedHabitRows.map((h: { id: string; name: string; identity_id: string | null; current_streak: number; identities: { statement: string } | { statement: string }[] | null }) => {
        const identity = Array.isArray(h.identities) ? h.identities[0]?.statement ?? null : h.identities?.statement ?? null
        const set = completedSetByHabit[h.id] ?? new Set()
        const week_completion = weekDates.map((ds) => set.has(ds))
        const completed_today = set.has(todayStr)
        return {
          id: h.id,
          name: h.name,
          identity,
          current_streak: h.current_streak ?? 0,
          completed_today,
          week_completion,
        }
      })
    }
  }

  const partnersWithLastActive = partnersWithSharedIds.map((p) => ({
    ...p,
    last_active: last_active_by_partner[p.partner_id] ?? null,
  }))

  let received_checkins: {
    id: string
    sender_id: string
    sender_name: string | null
    checkin_date: string
    personal_message: string | null
    summary_text: string
    created_at: string
  }[] = []
  if (includeDashboard) {
    try {
    const { data: shareRows } = await supabase
      .from('partner_checkin_shares')
      .select('id, sender_id, checkin_date, personal_message, summary_text, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (shareRows && shareRows.length > 0) {
      const senderIds = [...new Set(shareRows.map((r: { sender_id: string }) => r.sender_id))]
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', senderIds)
      const senderNames: Record<string, string | null> = {}
      for (const p of senderProfiles ?? []) {
        senderNames[p.id] = p.display_name ?? null
      }
      received_checkins = shareRows.map((r: { id: string; sender_id: string; checkin_date: string; personal_message: string | null; summary_text: string; created_at: string }) => ({
        id: r.id,
        sender_id: r.sender_id,
        sender_name: senderNames[r.sender_id] ?? null,
        checkin_date: r.checkin_date,
        personal_message: r.personal_message,
        summary_text: r.summary_text,
        created_at: r.created_at,
      }))
    }
    } catch (error) {
      logWarn('Failed to load partner_checkin_shares; continuing without received check-ins', {
        user_id: user.id,
        route: '/api/partners',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    partners: partnersWithLastActive,
    pending_invites,
    shared_habits_count,
    shared_habits,
    received_checkins,
    my_habits,
    habit_shares_by_habit,
  })
}
