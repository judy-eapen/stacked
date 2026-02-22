-- Phase 5: habit_contracts table + RLS for partner read on habits, habit_completions, reviews

CREATE TABLE public.habit_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  commitment text NOT NULL,
  consequence text,
  start_date date NOT NULL,
  end_date date,
  witness_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commitment_length CHECK (char_length(commitment) >= 1 AND char_length(commitment) <= 1000),
  CONSTRAINT consequence_length CHECK (consequence IS NULL OR (char_length(consequence) >= 1 AND char_length(consequence) <= 500))
);

CREATE INDEX idx_habit_contracts_user ON public.habit_contracts (user_id);
CREATE INDEX idx_habit_contracts_habit ON public.habit_contracts (habit_id);

ALTER TABLE public.habit_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can CRUD own habit_contracts"
  ON public.habit_contracts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Witness partner can select habit_contracts"
  ON public.habit_contracts FOR SELECT
  USING (auth.uid() = witness_partner_id);

-- Partner can read shared habits (user_id is the habit owner; partner_id = auth.uid())
CREATE POLICY "Partner can read shared habits"
  ON public.habits FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      is_shared = true
      AND EXISTS (
        SELECT 1 FROM public.partnerships p
        WHERE p.user_id = habits.user_id AND p.partner_id = auth.uid() AND p.status = 'accepted'
      )
    )
  );

-- Partner can read habit_completions for shared habits of users they partner with
CREATE POLICY "Partner can read completions for shared habits"
  ON public.habit_completions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.habits h
      JOIN public.partnerships p ON p.user_id = h.user_id AND p.partner_id = auth.uid() AND p.status = 'accepted'
      WHERE h.id = habit_completions.habit_id AND h.is_shared = true
    )
  );

-- Partner can read reviews of users they partner with
CREATE POLICY "Partner can read partner reviews"
  ON public.reviews FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.user_id = reviews.user_id AND p.partner_id = auth.uid() AND p.status = 'accepted'
    )
  );
