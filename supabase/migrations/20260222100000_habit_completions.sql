-- Phase 3: habit_completions table for daily check-in and streak logic
-- One row per habit per day; toggle via completed boolean (UPSERT).

CREATE TABLE public.habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_date date NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

CREATE INDEX idx_habit_completions_user_date ON public.habit_completions (user_id, completed_date);
CREATE INDEX idx_habit_completions_habit_date ON public.habit_completions (habit_id, completed_date);

COMMENT ON TABLE public.habit_completions IS 'One row per habit per day. Toggle completions via UPSERT on (habit_id, completed_date).';

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own habit_completions"
  ON public.habit_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
