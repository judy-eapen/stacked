import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** POST { subscription_id?: string }. Sets push_enabled and optionally stores subscription id. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { subscription_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subscriptionId = typeof body.subscription_id === 'string' ? body.subscription_id.trim() || null : null

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (prefs) {
    await supabase
      .from('notification_preferences')
      .update({ push_enabled: true })
      .eq('user_id', user.id)
  } else {
    await supabase.from('notification_preferences').insert({
      user_id: user.id,
      push_enabled: true,
    })
  }

  if (subscriptionId) {
    await supabase
      .from('profiles')
      .update({ onesignal_player_id: subscriptionId })
      .eq('id', user.id)
  }

  return NextResponse.json({ ok: true })
}
