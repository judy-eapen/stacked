-- Phase 4: reviews table for weekly/monthly reflection (wins, struggles, identity_reflection, adjustments)

CREATE TYPE public.review_type AS ENUM ('weekly', 'monthly');

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_type public.review_type NOT NULL,
  review_date date NOT NULL,
  wins text,
  struggles text,
  identity_reflection text,
  adjustments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, review_type, review_date)
);

CREATE INDEX idx_reviews_user_type_date ON public.reviews (user_id, review_type, review_date);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own reviews"
  ON public.reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
