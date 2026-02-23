import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isScheduledForDate,
  computeStreakFromHistory,
  toDateString,
  type HabitFrequency,
} from '@/lib/streaks'

export const dynamic = 'force-dynamic'

function parseDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return null
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
  return isNaN(d.getTime()) ? null : d
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { date?: string; completed?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 422 })
  }
  const dateStr = body.date ?? toDateString(new Date())
  const completed = body.completed !== false
  const d = parseDate(dateStr)
  if (!d) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 422 })
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const requestDate = new Date(d)
  requestDate.setHours(0, 0, 0, 0)
  if (requestDate > today) {
    return NextResponse.json({ error: 'Future dates not allowed' }, { status: 422 })
  }
  const diffDays = Math.floor((today.getTime() - requestDate.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays > 7) {
    return NextResponse.json({ error: 'Past dates only up to 7 days back' }, { status: 422 })
  }

  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id, user_id, identity_id, frequency, custom_days, identities(statement)')
    .eq('id', habitId)
    .single()

  if (habitError || !habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }
  if ((habit as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: upsertError } = await supabase.from('habit_completions').upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      completed_date: dateStr,
      completed,
    },
    { onConflict: 'habit_id,completed_date' }
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 365)
  const startStr = toDateString(startDate)
  const { data: compRows } = await supabase
    .from('habit_completions')
    .select('completed_date, completed')
    .eq('habit_id', habitId)
    .gte('completed_date', startStr)
    .lte('completed_date', toDateString(new Date()))

  // Build completed set using the value we just wrote for dateStr, so unchecking today
  // correctly excludes today and streak = consecutive days ending yesterday
  const otherCompleted = (compRows ?? [])
    .filter((r) => r.completed_date !== dateStr && r.completed)
    .map((r) => r.completed_date)
  const completedDates = completed
    ? [dateStr, ...otherCompleted].sort((a, b) => b.localeCompare(a))
    : otherCompleted.sort((a, b) => b.localeCompare(a))

  const hab = habit as {
    frequency: HabitFrequency
    custom_days: number[] | null
  }
  const isScheduledFn = (d: string) =>
    isScheduledForDate(hab.frequency, hab.custom_days, d)
  const todayStr = toDateString(new Date())
  const { current_streak } = computeStreakFromHistory(
    completedDates,
    todayStr,
    isScheduledFn
  )

  const lastCompleted = completedDates[0] ?? null
  const { error: updateErr } = await supabase
    .from('habits')
    .update({
      current_streak: current_streak,
      last_completed_date: lastCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId)
    .eq('user_id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const identitiesData = (habit as { identities: { statement: string } | { statement: string }[] | null }).identities
  const identity = Array.isArray(identitiesData) ? identitiesData[0]?.statement ?? null : identitiesData?.statement ?? null
  const identity_id = (habit as { identity_id: string | null }).identity_id ?? null

  let all_completed_today = false
  let remaining_count = 0
  if (dateStr === todayStr) {
    const { data: todayList } = await supabase
      .from('habits')
      .select('id, frequency, custom_days')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('archived_at', null)
    const scheduledToday = (todayList ?? []).filter((h: { id: string; frequency: HabitFrequency; custom_days: number[] | null }) =>
      isScheduledForDate(h.frequency, h.custom_days, todayStr)
    )
    const scheduledIds = scheduledToday.map((h: { id: string }) => h.id)
    const { data: todayCompletions } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', user.id)
      .eq('completed_date', todayStr)
      .eq('completed', true)
    const completedIds = new Set((todayCompletions ?? []).map((r) => r.habit_id))
    remaining_count = scheduledIds.filter((id) => !completedIds.has(id)).length
    all_completed_today = remaining_count === 0
  }

  return NextResponse.json({
    habit_id: habitId,
    date: dateStr,
    completed,
    current_streak: current_streak,
    identity,
    identity_id,
    all_completed_today,
    remaining_count,
  })
}
