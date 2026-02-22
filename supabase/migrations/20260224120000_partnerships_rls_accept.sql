-- Allow acceptor to SELECT and UPDATE pending partnership (partner_id IS NULL) by token.

DROP POLICY IF EXISTS "Either party can select partnership" ON public.partnerships;
CREATE POLICY "Either party can select partnership"
  ON public.partnerships FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (status = 'pending' AND partner_id IS NULL)
  );

DROP POLICY IF EXISTS "Either party can update (accept or remove)" ON public.partnerships;
CREATE POLICY "Either party can update (accept or remove)"
  ON public.partnerships FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (status = 'pending' AND partner_id IS NULL AND auth.uid() != user_id)
  )
  WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);
