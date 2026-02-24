-- Allow users to read profiles of their accepted partners (so partner names show on Partners page)
CREATE POLICY "Users can read accepted partners profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.status = 'accepted'
      AND p.partner_id IS NOT NULL
      AND (p.user_id = auth.uid() AND p.partner_id = profiles.id OR p.partner_id = auth.uid() AND p.user_id = profiles.id)
    )
  );
