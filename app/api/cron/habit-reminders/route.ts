import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getHabitsForReminderAtHour,
  buildHabitReminderEmailHtml,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Find UTC timestamp that when formatted in timezone gives (year, month, day, hour, minute). Binary search. */
function dateInTimezoneToISO(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = (d: Date) => {
    const p = fmt.formatToParts(d)
    const get = (t: string) => parseInt(p.find((x) => x.type === t)?.value ?? '0', 10)
    return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') }
  }
  let low = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  let high = Date.UTC(year, month - 1, day, 23, 59, 59, 999)
  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((low + high) / 2)
    const t = parts(new Date(mid))
    const cmp = t.y - year || t.m - month || t.d - day || t.h - hour || t.min - minute
    if (cmp === 0) return new Date(mid).toISOString()
    if (cmp < 0) low = mid + 1
    else high = mid - 1
  }
  return new Date(Math.floor((low + high) / 2)).toISOString()
}

/** Next occurrence of hour:minute in timezone, as ISO string. If that time today has passed, uses tomorrow. */
function nextOccurrenceISO(timezone: string, hour: number, minute: number): string {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
  let y = get('year')
  let m = get('month')
  const d = get('day')
  const h = get('hour')
  const min = get('minute')
  let day = d
  if (h > hour || (h === hour && min >= minute)) {
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1))
    y = nextDay.getUTCFullYear()
    m = nextDay.getUTCMonth() + 1
    day = nextDay.getUTCDate()
  }
  return dateInTimezoneToISO(timezone, y, m, day, hour, minute)
}

function formatTimeLabel(hour: number, minute: number): string {
  if (hour === 0 && minute === 0) return '12:00 AM'
  if (hour === 0) return `12:${String(minute).padStart(2, '0')} AM`
  if (hour < 12) return `${hour}:${String(minute).padStart(2, '0')} AM`
  if (hour === 12 && minute === 0) return '12:00 PM'
  if (hour === 12) return `12:${String(minute).padStart(2, '0')} PM`
  return `${hour - 12}:${String(minute).padStart(2, '0')} PM`
}

/** Run once per day. Schedules habit reminder emails with Resend's scheduledAt so Resend sends at the right time (no hourly cron). */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  const supabase = createAdminClient()
  const resend = new Resend(resendKey)

  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id, timezone, unsubscribe_token')
    .eq('email_reminders_enabled', true)

  if (prefsError || !prefs?.length) {
    return NextResponse.json({ scheduled: 0 })
  }

  const { data: habitsWithTime } = await supabase
    .from('habits')
    .select('user_id, email_reminder_time')
    .eq('is_active', true)
    .is('archived_at', null)
    .not('email_reminder_time', 'is', null)

  if (!habitsWithTime?.length) {
    return NextResponse.json({ scheduled: 0 })
  }

  const byUserAndTime = new Map<string, { hour: number; minute: number }>()
  for (const h of habitsWithTime as { user_id: string; email_reminder_time: string }[]) {
    const t = h.email_reminder_time
    const hour = parseInt(String(t).slice(0, 2), 10)
    const minute = parseInt(String(t).slice(3, 5), 10) || 0
    byUserAndTime.set(`${h.user_id}:${hour}:${minute}`, { hour, minute })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', prefs.map((p) => p.user_id))

  const profileByUserId = (profiles ?? []).reduce(
    (acc: Record<string, { email: string; display_name: string | null }>, p) => {
      acc[p.id] = { email: p.email, display_name: p.display_name ?? null }
      return acc
    },
    {}
  )

  let scheduled = 0
  for (const pref of prefs) {
    const tz = pref.timezone || 'America/New_York'
    const profile = profileByUserId[pref.user_id]
    if (!profile?.email) continue

    const keysForUser = [...byUserAndTime.entries()].filter(([k]) => k.startsWith(`${pref.user_id}:`))
    for (const [, { hour, minute }] of keysForUser) {
      const scheduledAtISO = nextOccurrenceISO(tz, hour, minute)
      const scheduledDate = new Date(scheduledAtISO)
      const dateStr = scheduledDate.toLocaleDateString('en-CA', { timeZone: tz }).replace(/\//g, '-')
      const habits = await getHabitsForReminderAtHour(supabase, pref.user_id, dateStr, hour)
      if (habits.length === 0) continue

      const unsubscribeUrl = appUrl
        ? `${appUrl.replace(/\/$/, '')}/unsubscribe?token=${pref.unsubscribe_token}`
        : ''
      const todayUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/dashboard/today` : '/dashboard/today'
      const timeLabel = formatTimeLabel(hour, minute)
      const html = buildHabitReminderEmailHtml(
        profile.display_name ?? '',
        habits,
        todayUrl,
        unsubscribeUrl,
        timeLabel
      )

      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Stacked <onboarding@resend.dev>',
        to: profile.email,
        subject: `Habit reminder – ${timeLabel} – Stacked`,
        html,
        scheduledAt: scheduledAtISO,
      })

      if (!sendError) scheduled++
    }
  }

  return NextResponse.json({ scheduled })
}
