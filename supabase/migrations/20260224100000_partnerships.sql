-- Phase 5: partnerships table for accountability partner (invite via link, accept, remove)

CREATE TYPE public.partnership_status AS ENUM ('pending', 'accepted', 'declined', 'removed');

CREATE TABLE public.partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.partnership_status NOT NULL DEFAULT 'pending',
  invite_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT no_self_partnership CHECK (partner_id IS NULL OR user_id != partner_id),
  UNIQUE (invite_token)
);

CREATE UNIQUE INDEX idx_partnerships_user_partner ON public.partnerships (user_id, partner_id) WHERE partner_id IS NOT NULL;

CREATE INDEX idx_partnerships_partner_status ON public.partnerships (partner_id, status);
CREATE INDEX idx_partnerships_user_status ON public.partnerships (user_id, status);

ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Either party can select partnership"
  ON public.partnerships FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (status = 'pending' AND partner_id IS NULL)
  );

CREATE POLICY "Only inviter can insert"
  ON public.partnerships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Either party can update (accept or remove)"
  ON public.partnerships FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (status = 'pending' AND partner_id IS NULL AND auth.uid() != user_id)
  )
  WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);
