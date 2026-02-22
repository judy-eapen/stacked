-- Optional link from habit-to-break to an existing habit (when user picks from list)
ALTER TABLE public.habits_to_break
  ADD COLUMN IF NOT EXISTS habit_id uuid NULL REFERENCES public.habits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_habits_to_break_habit ON public.habits_to_break (habit_id);

COMMENT ON COLUMN public.habits_to_break.habit_id IS 'When set, this blocker was chosen from an existing habit; name is synced from habit at add time.';
