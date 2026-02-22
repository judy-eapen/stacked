// Matches Supabase schema (Phase 1)
export type ScorecardRating = '+' | '-' | '='
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime'

export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ScorecardEntry {
  id: string
  user_id: string
  habit_name: string
  rating: ScorecardRating
  time_of_day: TimeOfDay | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Identity {
  id: string
  user_id: string
  statement: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** 4 laws for building a positive habit (Atomic Habits) */
export interface DesignBuild {
  obvious?: { clear_cue?: string; visible_trigger?: string; implementation_intention?: string }
  attractive?: { pair_with_enjoyment?: string; identity_reframe?: string; temptation_bundling?: string }
  easy?: { reduce_friction?: string; two_minute_rule?: string; environment_design?: string }
  satisfying?: { immediate_reward?: string; track_streak?: string; celebrate_completion?: string }
}

/** 4 laws for breaking a negative habit (inversion of Atomic Habits) */
export interface DesignBreak {
  invisible?: { remove_cues?: string; change_environment?: string; avoid_triggers?: string }
  unattractive?: { reframe_cost?: string; highlight_downside?: string; negative_identity?: string }
  difficult?: { increase_friction?: string; add_steps?: string; add_accountability?: string }
  unsatisfying?: { immediate_consequence?: string; accountability_partner?: string; loss_based?: string }
}
