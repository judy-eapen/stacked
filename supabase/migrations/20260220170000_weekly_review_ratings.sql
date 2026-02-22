-- Weekly review ratings (Workflow B): per-habit =/− for the week + friction + apply fix
-- week_start is Monday of the week (ISO week) for uniqueness

CREATE TYPE public.weekly_rating AS ENUM ('=', '-');

CREATE TABLE public.weekly_review_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  rating public.weekly_rating NOT NULL,
  friction text,
  advice_applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id, week_start)
);

CREATE TRIGGER weekly_review_ratings_updated_at
  BEFORE UPDATE ON public.weekly_review_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_weekly_review_ratings_user_week ON public.weekly_review_ratings (user_id, week_start);

ALTER TABLE public.weekly_review_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own weekly review ratings"
  ON public.weekly_review_ratings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON COLUMN public.weekly_review_ratings.friction IS 'What got in the way: Forgot, Too tired, Too busy, Phone, Boring, Hard';
COMMENT ON COLUMN public.weekly_review_ratings.advice_applied_at IS 'When user tapped Yes on Apply fix (e.g. change to 2-min version)';
