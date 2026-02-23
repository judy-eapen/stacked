-- Phase 6c: Google Calendar sync
-- calendar_connections stores encrypted refresh token per user; habits.google_event_id for sync tracking

CREATE TABLE public.calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_refresh_token text NOT NULL,
  google_calendar_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_calendar_connections_user ON public.calendar_connections (user_id);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar connection"
  ON public.calendar_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS google_event_id text;

COMMENT ON COLUMN public.calendar_connections.google_refresh_token IS 'Encrypted with AES-256-GCM; key in ENCRYPTION_KEY env';
COMMENT ON COLUMN public.habits.google_event_id IS 'Google Calendar event id for this habit (sync tracking)';
