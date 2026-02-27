import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCalendarClient, deleteEvent } from '@/lib/calendar'
import { logWarn } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: conn } = await admin
    .from('calendar_connections')
    .select('google_refresh_token, google_calendar_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (conn) {
    try {
      const { calendar, targetCalendarId } = getCalendarClient(
        conn.google_refresh_token,
        conn.google_calendar_id
      )
      const { data: habits } = await admin
        .from('habits')
        .select('id, google_event_id')
        .eq('user_id', user.id)
        .not('google_event_id', 'is', null)
      if (habits?.length) {
        for (const h of habits) {
          if (h.google_event_id) {
            try {
              await deleteEvent(calendar, targetCalendarId, h.google_event_id)
            } catch (error) {
              logWarn('Failed to delete Google Calendar event during disconnect', {
                user_id: user.id,
                route: '/api/calendar/disconnect',
                event_id: h.google_event_id,
                detail: error instanceof Error ? error.message : String(error),
              })
            }
          }
        }
      }
    } catch (error) {
      logWarn('Failed to initialize Google Calendar client during disconnect', {
        user_id: user.id,
        route: '/api/calendar/disconnect',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
    await admin.from('calendar_connections').delete().eq('user_id', user.id)
    await admin.from('habits').update({ google_event_id: null }).eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
