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

  const url = new URL(_request.url)
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')
  const toDate = toParam ? new Date(toParam + 'T12:00:00') : new Date()
  const toStr = toDate.toISOString().slice(0, 10)
  let fromDate: Date
  if (fromParam) {
    fromDate = new Date(fromParam + 'T12:00:00')
  } else {
    fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
  }
  const fromStr = fromDate.toISOString().slice(0, 10)

  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id, name, user_id, frequency, custom_days')
    .eq('id', habitId)
    .single()

  if (habitError || !habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }
  if ((habit as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: compRows, error: compError } = await supabase
    .from('habit_completions')
    .select('completed_date, completed')
    .eq('habit_id', habitId)
    .gte('completed_date', fromStr)
    .lte('completed_date', toStr)
    .order('completed_date', { ascending: false })

  if (compError) {
    return NextResponse.json({ error: compError.message }, { status: 500 })
  }

  const { count: totalCount } = await supabase
    .from('habit_completions')
    .select('*', { count: 'exact', head: true })
    .eq('habit_id', habitId)
    .eq('completed', true)

  const completedDates = (compRows ?? [])
    .filter((r) => r.completed)
    .map((r) => r.completed_date)
    .sort((a, b) => b.localeCompare(a))

  const hab = habit as { frequency: HabitFrequency; custom_days: number[] | null }
  const isScheduledFn = (d: string) =>
    isScheduledForDate(hab.frequency, hab.custom_days, d)
  const { current_streak, total_completions } = computeStreakFromHistory(
    completedDates,
    toStr,
    isScheduledFn
  )

  const totalCompletionsLifetime = totalCount ?? 0
  const scheduledInRange: string[] = []
  const d = new Date(fromDate)
  while (d <= toDate) {
    const ds = d.toISOString().slice(0, 10)
    if (isScheduledFn(ds)) scheduledInRange.push(ds)
    d.setDate(d.getDate() + 1)
  }
  const completionRate =
    scheduledInRange.length > 0
      ? completedDates.filter((d) => scheduledInRange.includes(d)).length / scheduledInRange.length
      : 0

  const completionsMap = new Set(
    (compRows ?? []).filter((r) => r.completed).map((r) => r.completed_date)
  )
  const completions = scheduledInRange
    .slice()
    .reverse()
    .map((date) => ({ date, completed: completionsMap.has(date) }))

  let longest_streak = 0
  let run = 0
  for (const ds of scheduledInRange.slice().reverse()) {
    if (completionsMap.has(ds)) {
      run++
      longest_streak = Math.max(longest_streak, run)
    } else {
      run = 0
    }
  }

  return NextResponse.json({
    habit_id: habitId,
    habit_name: (habit as { name: string }).name,
    current_streak: current_streak,
    longest_streak: longest_streak,
    total_completions: totalCompletionsLifetime,
    completion_rate: Math.round(completionRate * 100) / 100,
    completions,
  })
}
