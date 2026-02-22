import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** GET /api/unsubscribe?token=uuid&type=weekly (optional). Updates prefs and returns 200. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const type = url.searchParams.get('type')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: row, error: fetchError } = await supabase
      .from('notification_preferences')
      .select('id, user_id')
      .eq('unsubscribe_token', token)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    if (type === 'weekly') {
      await supabase
        .from('notification_preferences')
        .update({ email_weekly_summary: false })
        .eq('id', row.id)
    } else {
      await supabase
        .from('notification_preferences')
        .update({ email_reminders_enabled: false })
        .eq('id', row.id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
