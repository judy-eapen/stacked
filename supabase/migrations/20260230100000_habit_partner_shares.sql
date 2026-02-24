-- Per-partner habit sharing: which habits are shared with which partner (replaces single is_shared flag for multi-partner control)

CREATE TABLE public.habit_partner_shares (
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, partner_id)
);

-- RLS: habit owner can manage their shares (partner_id must be an accepted partner; enforced in app)
ALTER TABLE public.habit_partner_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Habit owner can manage own habit_partner_shares"
  ON public.habit_partner_shares
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_partner_shares.habit_id AND h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_partner_shares.habit_id AND h.user_id = auth.uid()
    )
  );

-- Partner can read shares where they are the partner (to see which habits are shared with them)
CREATE POLICY "Partner can read shares where they are partner"
  ON public.habit_partner_shares
  FOR SELECT
  USING (partner_id = auth.uid());

CREATE INDEX idx_habit_partner_shares_partner ON public.habit_partner_shares (partner_id);
CREATE INDEX idx_habit_partner_shares_habit ON public.habit_partner_shares (habit_id);

COMMENT ON TABLE public.habit_partner_shares IS 'Which habits the habit owner shares with which partner. Replaces global is_shared for per-partner control.';

-- Update habits RLS: partner can read habit if it is shared with them via habit_partner_shares (or legacy is_shared with any accepted partner)
DROP POLICY IF EXISTS "Partner can read shared habits" ON public.habits;
CREATE POLICY "Partner can read shared habits"
  ON public.habits FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.habit_partner_shares hps WHERE hps.habit_id = habits.id AND hps.partner_id = auth.uid())
    OR (
      is_shared = true
      AND EXISTS (
        SELECT 1 FROM public.partnerships p
        WHERE p.user_id = habits.user_id AND p.partner_id = auth.uid() AND p.status = 'accepted'
      )
    )
  );

-- Update habit_completions RLS: partner can read completions for habits shared with them via habit_partner_shares
DROP POLICY IF EXISTS "Partner can read completions for shared habits" ON public.habit_completions;
CREATE POLICY "Partner can read completions for shared habits"
  ON public.habit_completions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.habit_partner_shares hps
      WHERE hps.habit_id = habit_completions.habit_id AND hps.partner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.habits h
      JOIN public.partnerships p ON p.user_id = h.user_id AND p.partner_id = auth.uid() AND p.status = 'accepted'
      WHERE h.id = habit_completions.habit_id AND h.is_shared = true
    )
  );

-- Backfill: for every habit with is_shared = true, share with all of the owner's accepted partners
INSERT INTO public.habit_partner_shares (habit_id, partner_id)
SELECT h.id, (CASE WHEN p.user_id = h.user_id THEN p.partner_id ELSE p.user_id END)
FROM public.habits h
JOIN public.partnerships p
  ON p.status = 'accepted'
  AND (p.user_id = h.user_id OR p.partner_id = h.user_id)
  AND p.partner_id IS NOT NULL
WHERE h.is_shared = true
ON CONFLICT (habit_id, partner_id) DO NOTHING;
