import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encrypt'
import {
  getCalendarClient,
  habitToEventPayload,
  createEvent,
} from '@/lib/calendar'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'stacked_calendar_oauth_state'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : requestUrl.origin)
  const settingsUrl = `${origin.replace(/\/$/, '')}/dashboard/settings`

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=missing_params`)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get(STATE_COOKIE)?.value
  cookieStore.delete(STATE_COOKIE)
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=invalid_state`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=unauthorized`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/calendar/callback` : null)
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=config`)
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  let tokens
  try {
    const { tokens: t } = await oauth2.getToken(code)
    tokens = t
  } catch {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=exchange`)
  }
  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=no_refresh_token`)
  }

  const encryptedRefresh = encrypt(tokens.refresh_token)
  const admin = createAdminClient()
  const { error: upsertErr } = await admin
    .from('calendar_connections')
    .upsert(
      {
        user_id: user.id,
        google_refresh_token: encryptedRefresh,
        google_calendar_id: null,
        is_active: true,
      },
      { onConflict: 'user_id' }
    )
  if (upsertErr) {
    return NextResponse.redirect(`${settingsUrl}?calendar=error&reason=save`)
  }

  try {
    const { calendar, targetCalendarId } = getCalendarClient(encryptedRefresh, null)
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle()
    const timezone = prefs?.timezone || 'America/New_York'
    const { data: habits } = await admin
      .from('habits')
      .select('id, name, two_minute_version, implementation_intention')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('archived_at', null)
    if (habits?.length) {
      for (const habit of habits) {
        const payload = habitToEventPayload(
          {
            name: habit.name,
            two_minute_version: habit.two_minute_version,
            implementation_intention: habit.implementation_intention,
          },
          timezone
        )
        const eventId = await createEvent(calendar, targetCalendarId, payload)
        await admin.from('habits').update({ google_event_id: eventId }).eq('id', habit.id)
      }
    }
  } catch {
    // Sync best-effort; user is still connected
  }

  return NextResponse.redirect(`${settingsUrl}?calendar=connected`)
}
