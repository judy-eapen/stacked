import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isScheduledForDate,
  computeStreakFromHistory,
  toDateString,
  type HabitFrequency,
} from '@/lib/streaks'

export const dynamic = 'force-dynamic'

function parseDate(dateStr: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return null
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
  return isNaN(d.getTime()) ? null : dateStr
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const todayStr = toDateString(today)
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  let targetStr = todayStr
  if (dateParam) {
    const parsed = parseDate(dateParam)
    if (parsed) {
      const target = new Date(parsed + 'T12:00:00')
      const diffDays = Math.floor((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000))
      if (diffDays >= -1 && diffDays <= 7) targetStr = parsed
    }
  }

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select(
      `
      id,
      name,
      two_minute_version,
      implementation_intention,
      stack_anchor_scorecard_id,
      stack_anchor_habit_id,
      temptation_bundle,
      frequency,
      custom_days,
      current_streak,
      last_completed_date,
      identity_id,
      identities(statement)
    `
    )
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 })
  }

  const habitList = habits ?? []
  const habitIds = habitList.map((h: { id: string }) => h.id)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 60)
  const startStr = toDateString(startDate)

  const [completionsRes, totalsRes] = await Promise.all([
    supabase
      .from('habit_completions')
      .select('habit_id, completed_date, completed')
      .eq('user_id', user.id)
      .gte('completed_date', startStr)
      .lte('completed_date', todayStr),
    supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', user.id)
      .eq('completed', true),
  ])

  if (completionsRes.error) {
    return NextResponse.json({ error: completionsRes.error.message }, { status: 500 })
  }
  const completions = completionsRes.data ?? []

  const totalByHabit: Record<string, number> = {}
  for (const id of habitIds) {
    totalByHabit[id] = 0
  }
  for (const row of totalsRes.data ?? []) {
    if (totalByHabit[row.habit_id] !== undefined) {
      totalByHabit[row.habit_id]++
    }
  }

  const completedByHabit: Record<string, { dates: string[] }> = {}
  for (const id of habitIds) {
    completedByHabit[id] = { dates: [] }
  }
  for (const row of completions) {
    if (!row.completed) continue
    const id = row.habit_id
    if (completedByHabit[id]) {
      completedByHabit[id].dates.push(row.completed_date)
    }
  }
  for (const id of habitIds) {
    completedByHabit[id].dates.sort((a, b) => b.localeCompare(a))
  }

  const todayCompletions: Record<string, boolean> = {}
  for (const row of completions ?? []) {
    if (row.completed_date === targetStr) {
      todayCompletions[row.habit_id] = row.completed === true
    }
  }

  // Week containing targetStr (Monday = index 0 .. Sunday = index 6) for week_completion
  const targetDate = new Date(targetStr + 'T12:00:00')
  const dayOfWeek = targetDate.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(targetDate)
  weekStart.setDate(targetDate.getDate() - daysToMonday)
  function toLocalDateStr(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const outHabits: Record<string, unknown>[] = []
  for (const h of habitList) {
    const raw = h as {
      id: string
      name: string
      two_minute_version: string | null
      implementation_intention: { time?: string; location?: string; behavior?: string } | null
      stack_anchor_scorecard_id: string | null
      stack_anchor_habit_id: string | null
      temptation_bundle: string | null
      frequency: HabitFrequency
      custom_days: number[] | null
      identity_id: string | null
      identities: { statement: string } | { statement: string }[] | null
    }
    const habit = { ...raw, identities: Array.isArray(raw.identities) ? raw.identities[0] ?? null : raw.identities }
    const scheduled = isScheduledForDate(
      habit.frequency,
      habit.custom_days,
      targetStr
    )
    if (!scheduled) continue

    const identity = habit.identities?.statement ?? null
    const { dates } = completedByHabit[habit.id] ?? { dates: [] }
    const totalCompletionsLifetime = totalByHabit[habit.id] ?? 0
    const isScheduledFn = (d: string) =>
      isScheduledForDate(habit.frequency, habit.custom_days, d)
    const { current_streak, consecutive_misses } =
      computeStreakFromHistory(dates, targetStr, isScheduledFn)

    const completed_today = todayCompletions[habit.id] === true
    const missed_yesterday = consecutive_misses >= 1 && !completed_today

    const completedSet = new Set(dates)
    const week_completion: boolean[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      week_completion.push(completedSet.has(toLocalDateStr(d)))
    }

    let stack_context: string | null = null
    if (habit.stack_anchor_habit_id || habit.stack_anchor_scorecard_id) {
      if (habit.implementation_intention?.behavior) {
        stack_context = `After ${habit.implementation_intention.behavior}`
      } else {
        stack_context = 'After your cue'
      }
    }

    let time_of_day: string = 'anytime'
    if (habit.implementation_intention?.time) {
      const t = habit.implementation_intention.time.toLowerCase()
      if (t.includes('morning') || t.includes('am') || t.includes('6') || t.includes('7') || t.includes('8') || t.includes('9')) time_of_day = 'morning'
      else if (t.includes('afternoon') || t.includes('12') || t.includes('1') || t.includes('2') || t.includes('3') || t.includes('4') || t.includes('5')) time_of_day = 'afternoon'
      else if (t.includes('evening') || t.includes('night') || t.includes('pm')) time_of_day = 'evening'
    }

    outHabits.push({
      id: habit.id,
      name: habit.name,
      identity,
      identity_id: habit.identity_id,
      two_minute_version: habit.two_minute_version,
      implementation_intention: habit.implementation_intention,
      stack_context,
      temptation_bundle: habit.temptation_bundle,
      time_of_day,
      completed_today,
      current_streak,
      consecutive_misses,
      total_completions: totalCompletionsLifetime,
      missed_yesterday,
      week_completion,
    })
  }

  let days_since_last_visit = 0
  const lastCompletion = await supabase
    .from('habit_completions')
    .select('completed_date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('completed_date', { ascending: false })
    .limit(1)
    .single()
  if (lastCompletion.data?.completed_date) {
    const last = new Date(lastCompletion.data.completed_date + 'T12:00:00')
    const today = new Date(todayStr + 'T12:00:00')
    days_since_last_visit = Math.floor(
      (today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000)
    )
  }

  return NextResponse.json({
    date: targetStr,
    days_since_last_visit: Math.max(0, days_since_last_visit),
    habits: outHabits,
  })
}
