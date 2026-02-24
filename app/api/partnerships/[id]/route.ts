import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Remove partnership (either party). Sets status to 'removed'. */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partnershipId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row, error: fetchError } = await supabase
    .from('partnerships')
    .select('id, user_id, partner_id, status')
    .eq('id', partnershipId)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Partnership not found' }, { status: 404 })
  }

  const isParty = row.user_id === user.id || row.partner_id === user.id
  if (!isParty) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (row.status !== 'accepted' && row.status !== 'pending') {
    return NextResponse.json({ error: 'Partnership cannot be removed' }, { status: 422 })
  }

  const { error: updateError } = await supabase
    .from('partnerships')
    .update({ status: 'removed' })
    .eq('id', partnershipId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'removed' })
}
