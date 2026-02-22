-- Phase 6b: Push notifications (OneSignal)
-- Add push_enabled to notification_preferences, push_notification_enabled to habits, onesignal_player_id to profiles

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS push_notification_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onesignal_player_id text;
