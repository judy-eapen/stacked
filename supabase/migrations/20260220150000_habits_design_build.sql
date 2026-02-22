-- Add design_build JSONB to habits (4 laws for building a positive habit)
-- Run after habits_table migration

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS design_build jsonb;

COMMENT ON COLUMN public.habits.design_build IS '4 laws for building: obvious (clear_cue, visible_trigger, implementation_intention), attractive (pair_with_enjoyment, identity_reframe, temptation_bundling), easy (reduce_friction, two_minute_rule, environment_design), satisfying (immediate_reward, track_streak, celebrate_completion)';
