/**
 * Helpers for identity scoreboard: week bounds, votes, trend.
 * Uses habit last_completed_date (one per habit); no habit_completions table yet.
 */

export function getThisWeekBounds(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const start = monday.toISOString().slice(0, 10)
  const end = new Date(monday)
  end.setDate(monday.getDate() + 6)
  return { start, end: end.toISOString().slice(0, 10) }
}

export function getLastWeekBounds(): { start: string; end: string } {
  const { start, end } = getThisWeekBounds()
  const startDate = new Date(start)
  const endDate = new Date(end)
  startDate.setDate(startDate.getDate() - 7)
  endDate.setDate(endDate.getDate() - 7)
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  }
}

export function countVotesInRange(
  habits: { last_completed_date: string | null }[],
  range: { start: string; end: string }
): number {
  return habits.filter(
    (h) => h.last_completed_date && h.last_completed_date >= range.start && h.last_completed_date <= range.end
  ).length
}

/** Delta: this week minus last week. Positive = ↑, negative = ↓. */
export function getTrendDelta(
  habits: { last_completed_date: string | null }[],
  identityFilter: (h: { last_completed_date: string | null }) => boolean
): number | null {
  const identityHabits = habits.filter(identityFilter).filter((h) => h.last_completed_date)
  if (identityHabits.length === 0) return null
  const thisWeek = getThisWeekBounds()
  const lastWeek = getLastWeekBounds()
  const thisCount = countVotesInRange(identityHabits, thisWeek)
  const lastCount = countVotesInRange(identityHabits, lastWeek)
  return thisCount - lastCount
}
