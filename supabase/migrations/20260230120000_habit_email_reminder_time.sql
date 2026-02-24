-- Per-habit email reminder time (user's local time). When set, user gets an email at that time with this habit.
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS email_reminder_time time;

COMMENT ON COLUMN public.habits.email_reminder_time IS 'Local time (user timezone) to send an email reminder for this habit; null = no email reminder.';
