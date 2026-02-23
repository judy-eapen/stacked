-- Phase 7: Post-onboarding guided tour
-- Persist tour completion so the tour does not auto-show again

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.tour_completed_at IS 'When the user completed or skipped the guided tour; null = tour not yet shown/skipped';
