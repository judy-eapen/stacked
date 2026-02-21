-- Link scorecard entries to identities (optional). Used when creating an identity to link habits that support it.
ALTER TABLE public.scorecard_entries
  ADD COLUMN IF NOT EXISTS identity_id uuid REFERENCES public.identities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scorecard_entries_identity
  ON public.scorecard_entries (identity_id);

COMMENT ON COLUMN public.scorecard_entries.identity_id IS 'When set, this scorecard entry is linked to this identity (supports this identity statement).';
