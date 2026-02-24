-- Partner check-in shares: send today stats to a connected partner (in-app)
CREATE TABLE public.partner_checkin_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  personal_message text,
  summary_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_checkin_shares_recipient ON public.partner_checkin_shares (recipient_id, created_at DESC);
CREATE INDEX idx_partner_checkin_shares_sender ON public.partner_checkin_shares (sender_id, created_at DESC);

ALTER TABLE public.partner_checkin_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can insert own shares"
  ON public.partner_checkin_shares FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipient can read shares sent to them"
  ON public.partner_checkin_shares FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Sender can read own sent shares"
  ON public.partner_checkin_shares FOR SELECT
  USING (auth.uid() = sender_id);
