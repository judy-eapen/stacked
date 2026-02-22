import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { habitReminderHour, getStackContextForPush } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function currentHourInTimezone(timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  return parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appId = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) {
    return NextResponse.json({ error: 'ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set' }, { status: 500 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  const todayUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/dashboard/today` : '/dashboard/today'

  const supabase = createAdminClient()

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, timezone')
    .eq('push_enabled', true)

  if (!prefs?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const userIds = prefs.map((p) => p.user_id)
  const tzByUser = prefs.reduce((acc: Record<string, string>, p) => {
    acc[p.user_id] = p.timezone || 'America/New_York'
    return acc
  }, {})

  const { data: habits } = await supabase
    .from('habits')
    .select('id, user_id, name, implementation_intention')
    .in('user_id', userIds)
    .eq('push_notification_enabled', true)
    .eq('is_active', true)
    .is('archived_at', null)

  if (!habits?.length) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const habit of habits) {
    const userId = (habit as { user_id: string }).user_id
    const tz = tzByUser[userId] || 'America/New_York'
    const currentHour = currentHourInTimezone(tz)
    const reminderHour = habitReminderHour((habit as { implementation_intention: { time?: string } | null }).implementation_intention)
    if (currentHour !== reminderHour) continue

    const name = (habit as { name: string }).name
    const intention = (habit as { implementation_intention: { behavior?: string } | null }).implementation_intention
    const body = getStackContextForPush(intention)

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: 'push',
        include_aliases: { external_id: [userId] },
        contents: { en: body },
        headings: { en: name },
        url: todayUrl,
      }),
    })

    if (res.ok) sent++
  }

  return NextResponse.json({ sent })
}
