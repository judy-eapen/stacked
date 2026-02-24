import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Send today's check-in summary to a connected partner. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { partner_id?: string; checkin_date?: string; personal_message?: string; summary_text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const partner_id = body.partner_id?.trim()
  const checkin_date = body.checkin_date?.trim()
  const summary_text = (body.summary_text ?? '').trim()

  if (!partner_id || !checkin_date || !summary_text) {
    return NextResponse.json(
      { error: 'partner_id, checkin_date, and summary_text are required' },
      { status: 422 }
    )
  }

  const { data: partnership } = await supabase
    .from('partnerships')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(user_id.eq.${user.id},partner_id.eq.${partner_id}),and(user_id.eq.${partner_id},partner_id.eq.${user.id})`)
    .single()

  if (!partnership) {
    return NextResponse.json({ error: 'Partnership not found' }, { status: 404 })
  }

  const { error } = await supabase.from('partner_checkin_shares').insert({
    sender_id: user.id,
    recipient_id: partner_id,
    checkin_date,
    personal_message: (body.personal_message ?? '').trim() || null,
    summary_text,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
