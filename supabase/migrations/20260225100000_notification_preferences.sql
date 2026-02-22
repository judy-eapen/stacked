-- Phase 6a: notification_preferences for email reminders and weekly summary

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_reminders_enabled boolean NOT NULL DEFAULT true,
  email_reminder_time time NOT NULL DEFAULT '08:00',
  email_weekly_summary boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'America/New_York',
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  last_daily_reminder_sent_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (unsubscribe_token)
);

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences (user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own notification_preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User can insert own notification_preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own notification_preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
