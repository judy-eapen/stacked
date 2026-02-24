import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isScheduledForDate,
  computeStreakFromHistory,
  toDateString,
  type HabitFrequency,
} from './streaks'

export type HabitForEmail = {
  name: string
  completed_today: boolean
  current_streak: number
}

export type WeeklyHabitForEmail = {
  name: string
  current_streak: number
  completion_rate: number
  needs_attention: boolean
}

/** Get habits that have an email reminder at this hour (local), with today's completion status. */
export async function getHabitsForReminderAtHour(
  supabase: SupabaseClient,
  userId: string,
  dateStr: string,
  localHour: number
): Promise<HabitForEmail[]> {
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, frequency, custom_days, email_reminder_time')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('archived_at', null)
    .not('email_reminder_time', 'is', null)

  if (habitsError || !habits?.length) return []

  const habitIds = (habits as { id: string; email_reminder_time: string | null }[])
    .filter((h) => {
      const t = h.email_reminder_time
      if (!t) return false
      const hour = typeof t === 'string' ? parseInt(t.slice(0, 2), 10) : new Date(t).getUTCHours()
      return hour === localHour
    })
    .map((h) => h.id)

  if (habitIds.length === 0) return []

  const habitsAtHour = habits.filter((h: { id: string }) => habitIds.includes(h.id))
  const startDate = new Date(dateStr + 'T12:00:00')
  startDate.setDate(startDate.getDate() - 60)
  const startStr = toDateString(startDate)

  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_date, completed')
    .eq('user_id', userId)
    .gte('completed_date', startStr)
    .lte('completed_date', dateStr)

  const completedByHabit: Record<string, string[]> = {}
  for (const id of habitIds) completedByHabit[id] = []
  for (const row of completions ?? []) {
    if (!row.completed) continue
    if (completedByHabit[row.habit_id]) completedByHabit[row.habit_id].push(row.completed_date)
  }
  for (const id of habitIds) completedByHabit[id].sort((a: string, b: string) => b.localeCompare(a))

  const todayCompleted: Record<string, boolean> = {}
  for (const row of completions ?? []) {
    if (row.completed_date === dateStr && habitIds.includes(row.habit_id))
      todayCompleted[row.habit_id] = row.completed === true
  }

  const out: HabitForEmail[] = []
  for (const h of habitsAtHour) {
    const hab = h as { id: string; name: string; frequency: HabitFrequency; custom_days: number[] | null }
    const dates = completedByHabit[hab.id] ?? []
    const isScheduledFn = (d: string) =>
      isScheduledForDate(hab.frequency, hab.custom_days, d)
    const { current_streak } = computeStreakFromHistory(dates, dateStr, isScheduledFn)
    out.push({
      name: hab.name,
      completed_today: todayCompleted[hab.id] === true,
      current_streak: current_streak,
    })
  }
  return out
}

/** Get today's habits with completion status for a user (for daily email). */
export async function getTodayHabitsForUser(
  supabase: SupabaseClient,
  userId: string,
  dateStr: string
): Promise<HabitForEmail[]> {
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, frequency, custom_days')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })

  if (habitsError || !habits?.length) return []

  const habitIds = habits.map((h: { id: string }) => h.id)
  const startDate = new Date(dateStr + 'T12:00:00')
  startDate.setDate(startDate.getDate() - 60)
  const startStr = toDateString(startDate)

  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_date, completed')
    .eq('user_id', userId)
    .gte('completed_date', startStr)
    .lte('completed_date', dateStr)

  const completedByHabit: Record<string, string[]> = {}
  for (const id of habitIds) completedByHabit[id] = []
  for (const row of completions ?? []) {
    if (!row.completed) continue
    const id = row.habit_id
    if (completedByHabit[id]) completedByHabit[id].push(row.completed_date)
  }
  for (const id of habitIds) completedByHabit[id].sort((a, b) => b.localeCompare(a))

  const todayCompleted: Record<string, boolean> = {}
  for (const row of completions ?? []) {
    if (row.completed_date === dateStr) todayCompleted[row.habit_id] = row.completed === true
  }

  const out: HabitForEmail[] = []
  for (const h of habits) {
    const hab = h as { id: string; name: string; frequency: HabitFrequency; custom_days: number[] | null }
    if (!isScheduledForDate(hab.frequency, hab.custom_days, dateStr)) continue
    const dates = completedByHabit[hab.id] ?? []
    const isScheduledFn = (d: string) =>
      isScheduledForDate(hab.frequency, hab.custom_days, d)
    const { current_streak } = computeStreakFromHistory(dates, dateStr, isScheduledFn)
    out.push({
      name: hab.name,
      completed_today: todayCompleted[hab.id] === true,
      current_streak: current_streak,
    })
  }
  return out
}

function getWeekBounds(weekStart: string): { start: string; end: string } {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: weekStart, end: toDateString(end) }
}

/** Get weekly summary data for a user (for weekly email). */
export async function getWeeklySummaryForUser(
  supabase: SupabaseClient,
  userId: string,
  weekStartMonday: string
): Promise<{
  habits: WeeklyHabitForEmail[]
  overallCompletionRate: number
}> {
  const { start, end } = getWeekBounds(weekStartMonday)
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, frequency, custom_days, current_streak')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })

  if (habitsError || !habits?.length) {
    return { habits: [], overallCompletionRate: 0 }
  }

  const habitIds = habits.map((h: { id: string }) => h.id)
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_date, completed')
    .eq('user_id', userId)
    .gte('completed_date', start)
    .lte('completed_date', end)

  const completedByHabit: Record<string, number> = {}
  const scheduledByHabit: Record<string, number> = {}
  for (const h of habits) {
    const hab = h as { frequency: HabitFrequency; custom_days: number[] | null }
    let scheduled = 0
    const d = new Date(start + 'T12:00:00')
    const endDate = new Date(end + 'T12:00:00')
    while (d <= endDate) {
      if (isScheduledForDate(hab.frequency, hab.custom_days, toDateString(d))) scheduled++
      d.setDate(d.getDate() + 1)
    }
    scheduledByHabit[h.id] = scheduled
    completedByHabit[h.id] = 0
  }
  for (const row of completions ?? []) {
    if (row.completed && completedByHabit[row.habit_id] !== undefined) {
      completedByHabit[row.habit_id]++
    }
  }

  let totalScheduled = 0
  let totalCompleted = 0
  const out: WeeklyHabitForEmail[] = []
  for (const h of habits) {
    const scheduled = scheduledByHabit[h.id] ?? 0
    const completed = completedByHabit[h.id] ?? 0
    totalScheduled += scheduled
    totalCompleted += completed
    const rate = scheduled > 0 ? completed / scheduled : 0
    const needsAttention = scheduled >= 2 && completed < scheduled - 1
    out.push({
      name: (h as { name: string }).name,
      current_streak: (h as { current_streak: number }).current_streak,
      completion_rate: rate,
      needs_attention: needsAttention,
    })
  }
  const overallCompletionRate =
    totalScheduled > 0 ? totalCompleted / totalScheduled : 0
  return { habits: out, overallCompletionRate }
}

export function buildDailyEmailHtml(
  displayName: string,
  habits: HabitForEmail[],
  todayUrl: string,
  unsubscribeUrl: string
): string {
  const name = displayName?.trim() || 'there'
  const rows = habits
    .map(
      (h) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${h.completed_today ? '✓' : '○'} ${escapeHtml(h.name)}</td><td style="padding:8px 0;border-bottom:1px solid #eee">Streak: ${h.current_streak}</td></tr>`
    )
    .join('')
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Today's habits</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#333">
  <p>Hi ${escapeHtml(name)},</p>
  <p>Here's your habit check-in for today:</p>
  <table style="width:100%;border-collapse:collapse">${rows || '<tr><td style="padding:8px 0">No habits scheduled for today.</td></tr>'}</table>
  <p style="margin-top:24px"><a href="${todayUrl}" style="color:#e87722;font-weight:600">Open Today →</a></p>
  <p style="margin-top:32px;font-size:12px;color:#888"><a href="${unsubscribeUrl}">Unsubscribe from daily reminders</a></p>
</body>
</html>`
}

/** HTML for per-habit reminder email (habits due at this time). */
export function buildHabitReminderEmailHtml(
  displayName: string,
  habits: HabitForEmail[],
  todayUrl: string,
  unsubscribeUrl: string,
  timeLabel: string
): string {
  const name = displayName?.trim() || 'there'
  const rows = habits
    .map(
      (h) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${h.completed_today ? '✓' : '○'} ${escapeHtml(h.name)}</td><td style="padding:8px 0;border-bottom:1px solid #eee">Streak: ${h.current_streak}</td></tr>`
    )
    .join('')
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Habit reminder</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#333">
  <p>Hi ${escapeHtml(name)},</p>
  <p>Reminder (${escapeHtml(timeLabel)}): time to check in on these habits:</p>
  <table style="width:100%;border-collapse:collapse">${rows || '<tr><td style="padding:8px 0">No habits.</td></tr>'}</table>
  <p style="margin-top:24px"><a href="${todayUrl}" style="color:#e87722;font-weight:600">Open Today →</a></p>
  <p style="margin-top:32px;font-size:12px;color:#888"><a href="${unsubscribeUrl}">Unsubscribe from email reminders</a></p>
</body>
</html>`
}

export function buildWeeklyEmailHtml(
  displayName: string,
  habits: WeeklyHabitForEmail[],
  overallRate: number,
  weekLabel: string,
  appUrl: string,
  unsubscribeUrl: string
): string {
  const name = displayName?.trim() || 'there'
  const rows = habits
    .map(
      (h) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(h.name)}</td><td style="padding:8px 0;border-bottom:1px solid #eee">${h.current_streak} day streak</td><td style="padding:8px 0;border-bottom:1px solid #eee">${Math.round(h.completion_rate * 100)}%</td><td style="padding:8px 0;border-bottom:1px solid #eee">${h.needs_attention ? 'Needs attention' : '—'}</td></tr>`
    )
    .join('')
  const todayLink = appUrl ? `${appUrl.replace(/\/$/, '')}/dashboard/today` : '/dashboard/today'
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Weekly summary</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <p>Hi ${escapeHtml(name)},</p>
  <p>Your weekly habit summary for ${escapeHtml(weekLabel)}:</p>
  <p><strong>Overall completion: ${Math.round(overallRate * 100)}%</strong></p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="font-weight:600"><td style="padding:8px 0">Habit</td><td style="padding:8px 0">Streak</td><td style="padding:8px 0">Week</td><td style="padding:8px 0">Note</td></tr>
    ${rows || '<tr><td colspan="4" style="padding:8px 0">No habits.</td></tr>'}
  </table>
  <p style="margin-top:24px"><a href="${todayLink}" style="color:#e87722;font-weight:600">Open Stacked →</a></p>
  <p style="margin-top:32px;font-size:12px;color:#888"><a href="${unsubscribeUrl}">Unsubscribe from weekly summary</a></p>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
