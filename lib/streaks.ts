/**
 * Phase 3: "Never miss twice" streak logic.
 * - current_streak: consecutive days (going back from today) where user did not miss two days in a row.
 * - consecutive_misses: 0 = completed yesterday or today; 1 = missed yesterday only; 2+ = streak reset.
 */

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

/** Returns true if the habit is scheduled for the given date (local date string YYYY-MM-DD). */
export function isScheduledForDate(
  frequency: HabitFrequency,
  customDays: number[] | null,
  dateStr: string
): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  switch (frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return day >= 1 && day <= 5
    case 'weekends':
      return day === 0 || day === 6
    case 'custom':
      return Array.isArray(customDays) && customDays.includes(day)
    default:
      return true
  }
}

/** Dates from habit_completions: completed_date where completed = true. Sorted descending. */
export function computeStreakFromHistory(
  completedDates: string[],
  todayStr: string,
  isScheduled: (dateStr: string) => boolean
): { current_streak: number; consecutive_misses: number; total_completions: number } {
  const completedSet = new Set(completedDates)
  const today = new Date(todayStr + 'T12:00:00')
  let streak = 0
  let consecutiveMisses = 0
  let totalCompletions = completedDates.length

  // consecutive_misses: from today backwards, count scheduled days that were missed
  let d = new Date(today)
  while (isScheduled(d.toISOString().slice(0, 10))) {
    const ds = d.toISOString().slice(0, 10)
    if (completedSet.has(ds)) {
      break
    }
    consecutiveMisses++
    d.setDate(d.getDate() - 1)
    if (consecutiveMisses >= 2) break
  }

  // current_streak: walk back from today; count days in "run" until two consecutive scheduled misses
  d = new Date(today)
  let runMisses = 0
  while (true) {
    const ds = d.toISOString().slice(0, 10)
    if (!isScheduled(ds)) {
      d.setDate(d.getDate() - 1)
      continue
    }
    if (completedSet.has(ds)) {
      streak++
      runMisses = 0
    } else {
      runMisses++
      if (runMisses >= 2) break
    }
    d.setDate(d.getDate() - 1)
  }

  return { current_streak: streak, consecutive_misses: consecutiveMisses, total_completions: totalCompletions }
}

/** Format date as YYYY-MM-DD in local time. */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
