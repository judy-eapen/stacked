import type { DesignBreak, DesignBuild } from '@/lib/db-types'

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

export interface ImplementationIntention {
  behavior?: string
  time?: string
  location?: string
}

export interface Habit {
  id: string
  user_id: string
  identity_id: string | null
  name: string
  two_minute_version: string | null
  implementation_intention: ImplementationIntention | null
  stack_anchor_scorecard_id: string | null
  stack_anchor_habit_id: string | null
  temptation_bundle: string | null
  design_build: DesignBuild | null
  frequency: HabitFrequency
  custom_days: number[] | null
  is_active: boolean
  is_shared: boolean
  push_notification_enabled: boolean
  email_reminder_time: string | null
  sort_order: number
  current_streak: number
  last_completed_date: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface IdentityOption {
  id: string
  statement: string
  sort_order: number
}

export interface ScorecardAnchor {
  id: string
  habit_name: string
}

export interface HabitToBreak {
  id: string
  user_id: string
  identity_id: string
  habit_id: string | null
  name: string
  design_break: DesignBreak | null
  created_at: string
  updated_at: string
}
