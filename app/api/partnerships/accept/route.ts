import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const INVITE_EXPIRY_DAYS = 7

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { invite_token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const invite_token = body.invite_token?.trim()
  if (!invite_token) {
    return NextResponse.json({ error: 'invite_token required' }, { status: 422 })
  }

  const { data: row, error: fetchError } = await supabase
    .from('partnerships')
    .select('id, user_id, partner_id, status, created_at')
    .eq('invite_token', invite_token)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 })
  }

  if (row.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot partner with yourself' }, { status: 422 })
  }

  const isReaccept = row.status === 'removed' && row.partner_id === user.id
  if (!isReaccept) {
    const created = new Date(row.created_at)
    const expiry = new Date(created)
    expiry.setDate(expiry.getDate() + INVITE_EXPIRY_DAYS)
    if (new Date() > expiry) {
      return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 })
    }
  }

  if (row.status === 'accepted' && row.partner_id === user.id) {
    const { data: inviter } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', row.user_id)
      .single()
    return NextResponse.json(
      {
        partnership_id: row.id,
        user_display_name: inviter?.display_name ?? null,
        status: 'accepted',
      },
      { status: 200 }
    )
  }

  // Avoid duplicate (user_id, partner_id): at most one row can have that pair (unique index).
  const { data: anyExisting } = await supabase
    .from('partnerships')
    .select('id, status')
    .eq('user_id', row.user_id)
    .eq('partner_id', user.id)
    .limit(2)
  const otherRow = anyExisting?.find((r) => r.id !== row.id)
  if (otherRow?.status === 'accepted') {
    const { data: inviter } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', row.user_id)
      .single()
    return NextResponse.json(
      {
        partnership_id: otherRow.id,
        user_display_name: inviter?.display_name ?? null,
        status: 'accepted',
      },
      { status: 200 }
    )
  }
  // If other row is removed: reuse it instead of updating current row (so we don’t create two rows with same pair).
  if (otherRow?.status === 'removed') {
    const { error: reactivateError } = await supabase
      .from('partnerships')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', otherRow.id)
    if (!reactivateError) {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', row.user_id)
        .single()
      return NextResponse.json(
        {
          partnership_id: otherRow.id,
          user_display_name: inviter?.display_name ?? null,
          status: 'accepted',
        },
        { status: 200 }
      )
    }
  }

  const { error: updateError } = await supabase
    .from('partnerships')
    .update({
      partner_id: user.id,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  if (updateError) {
    if (updateError.code === '23505' && updateError.message?.includes('idx_partnerships_user_partner')) {
      // Another row (e.g. from a second invite) already has this pair; treat as already accepted
      const { data: other } = await supabase
        .from('partnerships')
        .select('id')
        .eq('user_id', row.user_id)
        .eq('partner_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle()
      if (other) {
        const { data: inviter } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', row.user_id)
          .single()
        return NextResponse.json(
          {
            partnership_id: other.id,
            user_display_name: inviter?.display_name ?? null,
            status: 'accepted',
          },
          { status: 200 }
        )
      }
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: inviter } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', row.user_id)
    .single()

  return NextResponse.json(
    {
      partnership_id: row.id,
      user_display_name: inviter?.display_name ?? null,
      status: 'accepted',
    },
    { status: 200 }
  )
}
