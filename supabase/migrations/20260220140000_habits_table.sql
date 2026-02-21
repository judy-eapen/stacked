-- Phase 2: habits table (Habit Design)
-- Run after Phase 1 and scorecard_identity_id migrations

CREATE TYPE public.habit_frequency AS ENUM ('daily', 'weekdays', 'weekends', 'custom');

CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity_id uuid REFERENCES public.identities(id) ON DELETE SET NULL,
  name text NOT NULL,
  two_minute_version text,
  implementation_intention jsonb,
  stack_anchor_scorecard_id uuid REFERENCES public.scorecard_entries(id) ON DELETE SET NULL,
  stack_anchor_habit_id uuid REFERENCES public.habits(id) ON DELETE SET NULL,
  temptation_bundle text,
  frequency public.habit_frequency NOT NULL DEFAULT 'daily',
  custom_days jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_shared boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  last_completed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT habit_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  CONSTRAINT two_minute_version_length CHECK (two_minute_version IS NULL OR (char_length(two_minute_version) >= 1 AND char_length(two_minute_version) <= 200)),
  CONSTRAINT temptation_bundle_length CHECK (temptation_bundle IS NULL OR (char_length(temptation_bundle) >= 1 AND char_length(temptation_bundle) <= 500)),
  CONSTRAINT one_stack_anchor CHECK (
    (stack_anchor_scorecard_id IS NULL AND stack_anchor_habit_id IS NULL) OR
    (stack_anchor_scorecard_id IS NOT NULL AND stack_anchor_habit_id IS NULL) OR
    (stack_anchor_scorecard_id IS NULL AND stack_anchor_habit_id IS NOT NULL)
  )
);

CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_habits_user_active_sort ON public.habits (user_id, is_active, sort_order);
CREATE INDEX idx_habits_identity ON public.habits (identity_id);
CREATE INDEX idx_habits_archived_at ON public.habits (user_id, archived_at) WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.habits.implementation_intention IS 'JSON: { behavior, time, location } for "I will [behavior] at [time] in [location]"';
COMMENT ON COLUMN public.habits.custom_days IS 'Array of day numbers 0-6 when frequency = custom (0 = Sunday)';

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own habits"
  ON public.habits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
