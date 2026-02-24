import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isScheduledForDate, toDateString, type HabitFrequency } from '@/lib/streaks'

export const dynamic = 'force-dynamic'

function getWeekBounds(weekStart: string): { start: string; end: string } {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: weekStart, end: toDateString(end) }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? 'weekly'
  const dateParam = url.searchParams.get('date')
  if (period !== 'weekly' || !dateParam) {
    return NextResponse.json({ error: 'period=weekly and date (YYYY-MM-DD Monday) required' }, { status: 422 })
  }
  const weekStart = dateParam.slice(0, 10)
  const { start, end } = getWeekBounds(weekStart)

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, identity_id, frequency, custom_days, current_streak, identities(statement)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 })
  }

  const habitList = habits ?? []
  const habitIds = habitList.map((h: { id: string }) => h.id)

  const [completionsRes, totalsRes] = await Promise.all([
    supabase
      .from('habit_completions')
      .select('habit_id, completed_date, completed')
      .eq('user_id', user.id)
      .gte('completed_date', start)
      .lte('completed_date', end),
    supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', user.id)
      .eq('completed', true),
  ])
  const completions = completionsRes.data ?? []
  const totalByHabit: Record<string, number> = {}
  for (const id of habitIds) totalByHabit[id] = 0
  for (const row of totalsRes.data ?? []) {
    if (totalByHabit[row.habit_id] !== undefined) totalByHabit[row.habit_id]++
  }

  const completedByHabit: Record<string, number> = {}
  const scheduledDaysByHabit: Record<string, number> = {}
  for (const h of habitList) {
    const hab = h as { frequency: HabitFrequency; custom_days: number[] | null }
    let scheduled = 0
    const d = new Date(start + 'T12:00:00')
    const endDate = new Date(end + 'T12:00:00')
    while (d <= endDate) {
      if (isScheduledForDate(hab.frequency, hab.custom_days, toDateString(d))) scheduled++
      d.setDate(d.getDate() + 1)
    }
    scheduledDaysByHabit[h.id] = scheduled
    completedByHabit[h.id] = 0
  }
  const completedDatesByHabit: Record<string, Set<string>> = {}
  for (const id of habitIds) completedDatesByHabit[id] = new Set()
  for (const row of completions ?? []) {
    if (row.completed && completedByHabit[row.habit_id] !== undefined) {
      completedByHabit[row.habit_id]++
      completedDatesByHabit[row.habit_id].add(row.completed_date)
    }
  }

  const weekDates: string[] = []
  const dWalk = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (dWalk <= endDate) {
    weekDates.push(toDateString(dWalk))
    dWalk.setDate(dWalk.getDate() + 1)
  }

  const priorWeekStart = new Date(start + 'T12:00:00')
  priorWeekStart.setDate(priorWeekStart.getDate() - 7)
  const priorStart = toDateString(priorWeekStart)
  const priorEnd = new Date(priorWeekStart)
  priorEnd.setDate(priorEnd.getDate() + 6)
  const priorEndStr = toDateString(priorEnd)

  const { data: priorCompletions } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_date, completed')
    .eq('user_id', user.id)
    .gte('completed_date', priorStart)
    .lte('completed_date', priorEndStr)

  const priorStreakByHabit: Record<string, number> = {}
  for (const id of habitIds) priorStreakByHabit[id] = 0
  const priorCompletedSet: Record<string, Set<string>> = {}
  for (const id of habitIds) priorCompletedSet[id] = new Set()
  for (const row of priorCompletions ?? []) {
    if (row.completed && priorCompletedSet[row.habit_id]) {
      priorCompletedSet[row.habit_id].add(row.completed_date)
    }
  }

  const identityVotes: Record<string, number> = {}
  const outHabits: {
    habit_id: string
    habit_name: string
    identity: string | null
    completion_rate: number
    current_streak: number
    streak_change: number
    missed_two_plus: boolean
    total_completions: number
    scheduled_days: number
    completed_count: number
    week_completion: boolean[]
  }[] = []

  for (const h of habitList) {
    const raw = h as { id: string; name: string; identity_id: string | null; current_streak: number; identities: { statement: string } | { statement: string }[] | null }
    const identity = Array.isArray(raw.identities) ? raw.identities[0]?.statement ?? null : raw.identities?.statement ?? null
    const scheduled = scheduledDaysByHabit[h.id] || 1
    const completed = completedByHabit[h.id] || 0
    const completion_rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) / 100 : 0
    const missed_two_plus = scheduled >= 2 && completed < scheduled - 1
    const priorCount = priorCompletedSet[h.id]?.size ?? 0
    const priorStreak = Math.min(7, priorCount)
    const streak_change = raw.current_streak - priorStreak
    const completedSet = completedDatesByHabit[h.id] ?? new Set()
    const week_completion = weekDates.map((dateStr) => completedSet.has(dateStr))
    outHabits.push({
      habit_id: raw.id,
      habit_name: raw.name,
      identity,
      completion_rate,
      current_streak: raw.current_streak,
      streak_change,
      missed_two_plus: missed_two_plus,
      total_completions: totalByHabit[h.id] ?? 0,
      scheduled_days: scheduled,
      completed_count: completed,
      week_completion,
    })
    if (identity) {
      identityVotes[identity] = (identityVotes[identity] ?? 0) + completed
    }
  }

  return NextResponse.json({
    period: 'weekly',
    week_start: weekStart,
    date_range: { start, end },
    habits: outHabits,
    identity_votes: identityVotes,
  })
}
