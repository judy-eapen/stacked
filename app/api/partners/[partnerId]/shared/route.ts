import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isScheduledForDate,
  computeStreakFromHistory,
  toDateString,
  type HabitFrequency,
} from '@/lib/streaks'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const { partnerId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: partnership } = await supabase
    .from('partnerships')
    .select('id')
    .eq('user_id', partnerId)
    .eq('partner_id', user.id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!partnership) {
    return NextResponse.json({ error: 'No active partnership with this user' }, { status: 403 })
  }

  const { data: partnerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', partnerId)
    .single()

  if (profileError || !partnerProfile) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  const todayStr = toDateString(new Date())
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = toDateString(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = toDateString(weekEnd)

  const { data: shareRows } = await supabase
    .from('habit_partner_shares')
    .select('habit_id')
    .eq('partner_id', user.id)
  const sharedHabitIds = (shareRows ?? []).map((r: { habit_id: string }) => r.habit_id)

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, identity_id, frequency, custom_days, current_streak, identities(statement)')
    .eq('user_id', partnerId)
    .eq('is_active', true)
    .is('archived_at', null)
    .in('id', sharedHabitIds.length > 0 ? sharedHabitIds : ['00000000-0000-0000-0000-000000000000'])
    .order('sort_order', { ascending: true })

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 })
  }

  const habitList = habits ?? []
  const habitIds = habitList.map((h: { id: string }) => h.id)
  if (habitIds.length === 0) {
    const { data: latestReview } = await supabase
      .from('reviews')
      .select('review_type, review_date, wins, struggles')
      .eq('user_id', partnerId)
      .order('review_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastActiveRes = await supabase
      .from('habit_completions')
      .select('completed_date')
      .eq('user_id', partnerId)
      .eq('completed', true)
      .order('completed_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      partner: {
        display_name: partnerProfile.display_name ?? '',
        avatar_url: partnerProfile.avatar_url ?? null,
      },
      habits: [],
      latest_review: latestReview
        ? {
            review_type: latestReview.review_type,
            review_date: latestReview.review_date,
            wins: latestReview.wins ?? '',
            struggles: latestReview.struggles ?? '',
          }
        : null,
      last_active: lastActiveRes.data?.completed_date ?? null,
    })
  }

  const fromStr = new Date()
  fromStr.setDate(fromStr.getDate() - 365)
  const fromStrOnly = toDateString(fromStr)

  const [completionsRes, contractsRes, weekCompletionsRes, latestReviewRes, lastActiveRes] =
    await Promise.all([
      supabase
        .from('habit_completions')
        .select('habit_id, completed_date, completed')
        .eq('user_id', partnerId)
        .gte('completed_date', fromStrOnly)
        .lte('completed_date', todayStr),
      supabase
        .from('habit_contracts')
        .select('habit_id, commitment, consequence, start_date, end_date')
        .in('habit_id', habitIds),
      supabase
        .from('habit_completions')
        .select('habit_id')
        .eq('user_id', partnerId)
        .eq('completed', true)
        .gte('completed_date', weekStartStr)
        .lte('completed_date', weekEndStr),
      supabase
        .from('reviews')
        .select('review_type, review_date, wins, struggles')
        .eq('user_id', partnerId)
        .order('review_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('habit_completions')
        .select('completed_date')
        .eq('user_id', partnerId)
        .eq('completed', true)
        .order('completed_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const completions = completionsRes.data ?? []
  const contracts = (contractsRes.data ?? []).reduce(
    (acc: Record<string, { commitment: string; consequence: string | null; start_date: string; end_date: string | null }>,
     row
  ) => {
    acc[row.habit_id] = {
      commitment: row.commitment,
      consequence: row.consequence ?? null,
      start_date: row.start_date,
      end_date: row.end_date ?? null,
    }
    return acc
  },
    {}
  )
  const weekCountByHabit: Record<string, number> = {}
  for (const id of habitIds) weekCountByHabit[id] = 0
  for (const row of weekCompletionsRes.data ?? []) {
    if (weekCountByHabit[row.habit_id] !== undefined) weekCountByHabit[row.habit_id]++
  }

  const completedByHabit: Record<string, string[]> = {}
  for (const id of habitIds) completedByHabit[id] = []
  for (const row of completions) {
    if (!row.completed) continue
    const id = row.habit_id
    if (completedByHabit[id]) completedByHabit[id].push(row.completed_date)
  }
  for (const id of habitIds) completedByHabit[id].sort((a, b) => b.localeCompare(a))

  const todaySet = new Set(
    completions.filter((r) => r.completed_date === todayStr && r.completed).map((r) => r.habit_id)
  )

  const scheduledInRangeByHabit: Record<string, string[]> = {}
  for (const h of habitList) {
    const hab = h as { frequency: HabitFrequency; custom_days: number[] | null }
    const arr: string[] = []
    const d = new Date(fromStrOnly + 'T12:00:00')
    const toDate = new Date(todayStr + 'T12:00:00')
    while (d <= toDate) {
      const ds = d.toISOString().slice(0, 10)
      if (isScheduledForDate(hab.frequency, hab.custom_days, ds)) arr.push(ds)
      d.setDate(d.getDate() + 1)
    }
    scheduledInRangeByHabit[h.id] = arr
  }

  const today = new Date(todayStr + 'T12:00:00')
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const rangeStart = toDateString(thirtyDaysAgo)

  const outHabits: {
    id: string
    name: string
    identity: string | null
    current_streak: number
    longest_streak: number
    completed_today: boolean
    completions_this_week: number
    contract: { commitment: string; consequence: string | null; start_date: string; end_date: string | null } | null
    completed_dates: string[]
  }[] = []

  for (const h of habitList) {
    const raw = h as {
      id: string
      name: string
      identity_id: string | null
      frequency: HabitFrequency
      custom_days: number[] | null
      identities: { statement: string } | { statement: string }[] | null
    }
    const identity = Array.isArray(raw.identities) ? raw.identities[0]?.statement ?? null : raw.identities?.statement ?? null
    const dates = completedByHabit[h.id] ?? []
    const isScheduledFn = (d: string) =>
      isScheduledForDate(raw.frequency, raw.custom_days, d)
    const { current_streak } = computeStreakFromHistory(dates, todayStr, isScheduledFn)
    const scheduledInRange = scheduledInRangeByHabit[h.id] ?? []
    const completionSet = new Set(dates)
    let longest_streak = 0
    let run = 0
    for (const ds of [...scheduledInRange].sort()) {
      if (completionSet.has(ds)) {
        run++
        longest_streak = Math.max(longest_streak, run)
      } else {
        run = 0
      }
    }

    const datesInRange = dates.filter((d) => d >= rangeStart && d <= todayStr)
    outHabits.push({
      id: raw.id,
      name: raw.name,
      identity,
      current_streak,
      longest_streak,
      completed_today: todaySet.has(raw.id),
      completions_this_week: weekCountByHabit[raw.id] ?? 0,
      contract: contracts[raw.id] ?? null,
      completed_dates: datesInRange,
    })
  }

  const latestReview = latestReviewRes.data
  return NextResponse.json({
    partner: {
      display_name: partnerProfile.display_name ?? '',
      avatar_url: partnerProfile.avatar_url ?? null,
    },
    habits: outHabits,
    latest_review: latestReview
      ? {
          review_type: latestReview.review_type,
          review_date: latestReview.review_date,
          wins: latestReview.wins ?? '',
          struggles: latestReview.struggles ?? '',
        }
      : null,
    last_active: lastActiveRes.data?.completed_date ?? null,
  })
}

/** Update which habits the current user shares with this partner. Body: { habit_ids: string[] } */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const { partnerId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: partnership } = await supabase
    .from('partnerships')
    .select('id')
    .or(`and(user_id.eq.${user.id},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${user.id})`)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!partnership) {
    return NextResponse.json({ error: 'No active partnership with this partner' }, { status: 403 })
  }

  let body: { habit_ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const habitIds = Array.isArray(body.habit_ids) ? body.habit_ids : []

  const { data: myHabits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('archived_at', null)
  const myHabitIds = new Set((myHabits ?? []).map((h: { id: string }) => h.id))
  const validIds = habitIds.filter((id) => myHabitIds.has(id))

  await supabase
    .from('habit_partner_shares')
    .delete()
    .eq('partner_id', partnerId)
    .in('habit_id', myHabitIds.size > 0 ? [...myHabitIds] : ['00000000-0000-0000-0000-000000000000'])

  if (validIds.length > 0) {
    await supabase.from('habit_partner_shares').insert(
      validIds.map((habit_id) => ({ habit_id, partner_id: partnerId }))
    )
  }

  return NextResponse.json({ ok: true, shared_habit_ids: validIds })
}
