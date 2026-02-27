import type { DesignBreak, DesignBuild } from '@/lib/db-types'
import type { Habit } from './types'

export const EMPTY_DESIGN_BUILD: DesignBuild = {
  obvious: { clear_cue: '', visible_trigger: '', implementation_intention: '' },
  attractive: { pair_with_enjoyment: '', identity_reframe: '', temptation_bundling: '' },
  easy: { reduce_friction: '', two_minute_rule: '', environment_design: '' },
  satisfying: { immediate_reward: '', track_streak: '', celebrate_completion: '' },
}

export function isEmptyDesignBuild(d: DesignBuild | null | undefined): boolean {
  if (!d) return true
  const keys = ['obvious', 'attractive', 'easy', 'satisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      for (const v of Object.values(section)) {
        if (typeof v === 'string' && v.trim()) return false
      }
    }
  }
  return true
}

export function trimDesignBuild(d: DesignBuild | null | undefined): DesignBuild | null {
  if (!d) return null
  const out: DesignBuild = {}
  const keys = ['obvious', 'attractive', 'easy', 'satisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      const trimmed: Record<string, string> = {}
      for (const [k, v] of Object.entries(section)) {
        if (typeof v === 'string') trimmed[k] = v.trim()
      }
      if (Object.keys(trimmed).length) (out as Record<string, unknown>)[law] = trimmed
    }
  }
  return Object.keys(out).length ? out : null
}

export function hasDesignBreakFields(d: DesignBreak | null | undefined): boolean {
  if (!d) return false
  const keys = ['invisible', 'unattractive', 'difficult', 'unsatisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      for (const v of Object.values(section)) {
        if (typeof v === 'string' && v.trim()) return true
      }
    }
  }
  return false
}

export function designBreakSummaryLines(d: DesignBreak | null | undefined): string[] {
  const lines: string[] = []
  if (!d) return lines
  const labels: Record<string, string> = {
    invisible: 'Invisible',
    unattractive: 'Unattractive',
    difficult: 'Difficult',
    unsatisfying: 'Unsatisfying',
  }
  const keys = ['invisible', 'unattractive', 'difficult', 'unsatisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      const first = (Object.values(section) as string[]).find((v) => typeof v === 'string' && v.trim())
      if (first) lines.push(`${labels[law]}: ${first.trim()}`)
    }
  }
  return lines
}

export function designBreakStrategySummary(d: DesignBreak | null | undefined): string {
  const lines = designBreakSummaryLines(d)
  if (lines.length === 0) return ''
  return lines.map((l) => l.replace(/^[A-Za-z]+: /, '')).join('. ')
}

export function formatReminderTime(t: string): string {
  const s = String(t).slice(0, 5)
  const [h, m] = s.split(':').map((x) => parseInt(x, 10) || 0)
  if (h === 0 && m === 0) return '12:00 AM'
  if (h === 0) return `12:${String(m).padStart(2, '0')} AM`
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`
  if (h === 12) return `12:${String(m).padStart(2, '0')} PM`
  return `${h - 12}:${String(m).padStart(2, '0')} PM`
}

export function hasDesignFields(h: Habit): boolean {
  if (!isEmptyDesignBuild(h.design_build ?? null)) return true
  const hasIntention = h.implementation_intention && (
    (h.implementation_intention.behavior ?? '').trim() ||
    (h.implementation_intention.time ?? '').trim() ||
    (h.implementation_intention.location ?? '').trim()
  )
  return !!(
    hasIntention ||
    (h.two_minute_version ?? '').trim() ||
    (h.temptation_bundle ?? '').trim() ||
    h.stack_anchor_scorecard_id ||
    h.stack_anchor_habit_id
  )
}
