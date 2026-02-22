-- Habits to break: one per identity (4 laws inversion for breaking a negative habit)
-- Run after identities and habits_table migrations

CREATE TABLE public.habits_to_break (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  name text NOT NULL,
  design_break jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT habits_to_break_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  CONSTRAINT habits_to_break_identity_unique UNIQUE (identity_id)
);

CREATE TRIGGER habits_to_break_updated_at
  BEFORE UPDATE ON public.habits_to_break
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_habits_to_break_user ON public.habits_to_break (user_id);
CREATE INDEX idx_habits_to_break_identity ON public.habits_to_break (identity_id);

COMMENT ON COLUMN public.habits_to_break.design_break IS '4 laws for breaking: invisible (remove_cues, change_environment, avoid_triggers), unattractive (reframe_cost, highlight_downside, negative_identity), difficult (increase_friction, add_steps, add_accountability), unsatisfying (immediate_consequence, accountability_partner, loss_based)';

ALTER TABLE public.habits_to_break ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own habits_to_break"
  ON public.habits_to_break
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
