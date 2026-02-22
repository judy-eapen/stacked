/**
 * Phase 6b: Parse habit "reminder hour" from implementation_intention.time for push.
 * Returns hour 0-23; default 8 (morning).
 */
export function habitReminderHour(implementationIntention: { time?: string } | null): number {
  if (!implementationIntention?.time) return 8
  const t = String(implementationIntention.time).toLowerCase()
  if (t.includes('morning') || t.includes('8am') || t.includes('8 am')) return 8
  if (t.includes('afternoon') || t.includes('noon') || t.includes('12')) return 12
  if (t.includes('evening') || t.includes('night') || t.includes('pm')) return 18
  const hourMatch = t.match(/(\d{1,2})\s*(am|pm)?/)
  if (hourMatch) {
    let h = parseInt(hourMatch[1], 10)
    if (hourMatch[2] === 'pm' && h < 12) h += 12
    if (hourMatch[2] === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23) return h
  }
  return 8
}

export function getStackContextForPush(
  implementationIntention: { behavior?: string } | null,
  _stackAnchor?: boolean
): string {
  if (implementationIntention?.behavior) {
    return `After ${implementationIntention.behavior}`
  }
  return 'Time to check in'
}
