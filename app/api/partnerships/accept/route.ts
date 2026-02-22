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

  const created = new Date(row.created_at)
  const expiry = new Date(created)
  expiry.setDate(expiry.getDate() + INVITE_EXPIRY_DAYS)
  if (new Date() > expiry) {
    return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 })
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

  const { data: existing } = await supabase
    .from('partnerships')
    .select('id')
    .eq('user_id', row.user_id)
    .eq('partner_id', user.id)
    .eq('status', 'accepted')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Partnership already exists' }, { status: 409 })
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
