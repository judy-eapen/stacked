import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  const dashboard = url.searchParams.get('dashboard') === '1'

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
    .select('id, display_name, avatar_url')
    .in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000'])

  const profileMap = (profiles ?? []).reduce(
    (acc: Record<string, { display_name: string | null; avatar_url: string | null }>, p) => {
      acc[p.id] = { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null }
      return acc
    },
    {}
  )

  const partners = acceptedRows.map((r) => {
    const otherId = r.user_id === user.id ? r.partner_id : r.user_id
    const p = profileMap[otherId]
    return {
      partnership_id: r.id,
      partner_id: otherId,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      accepted_at: r.accepted_at ?? null,
    }
  })

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

  if (dashboard || true) {
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

    const { count } = await supabase
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_shared', true)
      .eq('is_active', true)
      .is('archived_at', null)
    shared_habits_count = count ?? 0

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

    const { data: sharedHabitRows } = await supabase
      .from('habits')
      .select('id, name, identity_id, current_streak, identities(statement)')
      .eq('user_id', user.id)
      .eq('is_shared', true)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })

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

  const partnersWithLastActive = partners.map((p) => ({
    ...p,
    last_active: last_active_by_partner[p.partner_id] ?? null,
  }))

  return NextResponse.json({
    partners: partnersWithLastActive,
    pending_invites,
    shared_habits_count,
    shared_habits,
  })
}
