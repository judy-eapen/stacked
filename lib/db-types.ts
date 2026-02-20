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
