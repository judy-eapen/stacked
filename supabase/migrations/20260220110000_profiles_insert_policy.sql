-- Allow users to insert their own profile row (e.g. if trigger didn't run or user created before trigger existed).
-- Enables upsert from the app so display-name step always has a row to update.
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
