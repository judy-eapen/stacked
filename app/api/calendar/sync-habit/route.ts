import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logWarn } from '@/lib/logger'
import {
  getCalendarClient,
  habitToEventPayload,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/calendar'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { habitId?: string; remove?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const habitId = body.habitId
  const remove = body.remove === true
  if (!habitId) {
    return NextResponse.json({ error: 'habitId required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conn } = await admin
    .from('calendar_connections')
    .select('google_refresh_token, google_calendar_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!conn) {
    return NextResponse.json({ ok: true })
  }

  const { data: habit } = await admin
    .from('habits')
    .select('id, user_id, name, two_minute_version, implementation_intention, archived_at, google_event_id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single()
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  const { calendar, targetCalendarId } = getCalendarClient(
    conn.google_refresh_token,
    conn.google_calendar_id
  )

  if (remove || habit.archived_at) {
    if (habit.google_event_id) {
      try {
        await deleteEvent(calendar, targetCalendarId, habit.google_event_id)
      } catch (error) {
        logWarn('Failed to delete calendar event for removed habit; continuing cleanup', {
          user_id: user.id,
          route: '/api/calendar/sync-habit',
          habit_id: habitId,
          event_id: habit.google_event_id,
          detail: error instanceof Error ? error.message : String(error),
        })
      }
      await admin.from('habits').update({ google_event_id: null }).eq('id', habitId).eq('user_id', user.id)
    }
    return NextResponse.json({ ok: true })
  }

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('timezone')
    .eq('user_id', user.id)
    .maybeSingle()
  const timezone = prefs?.timezone || 'America/New_York'
  const payload = habitToEventPayload(
    {
      name: habit.name,
      two_minute_version: habit.two_minute_version,
      implementation_intention: habit.implementation_intention,
    },
    timezone
  )

  if (habit.google_event_id) {
    try {
      await updateEvent(calendar, targetCalendarId, habit.google_event_id, payload)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('404') || msg.includes('not found')) {
        const eventId = await createEvent(calendar, targetCalendarId, payload)
        await admin.from('habits').update({ google_event_id: eventId }).eq('id', habitId).eq('user_id', user.id)
      } else {
        throw e
      }
    }
  } else {
    const eventId = await createEvent(calendar, targetCalendarId, payload)
    await admin.from('habits').update({ google_event_id: eventId }).eq('id', habitId).eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
