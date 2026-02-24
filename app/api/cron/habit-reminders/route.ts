import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getHabitsForReminderAtHour,
  buildHabitReminderEmailHtml,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function todayInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value ?? ''
  const m = parts.find((p) => p.type === 'month')?.value ?? ''
  const d = parts.find((p) => p.type === 'day')?.value ?? ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function hourInTimezone(timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  })
  const hourStr = formatter.format(new Date())
  return parseInt(hourStr, 10)
}

function formatTimeLabel(hour: number): string {
  if (hour === 0) return '12:00 AM'
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return '12:00 PM'
  return `${hour - 12}:00 PM`
}

/** Run hourly. Sends email reminders for habits that have email_reminder_time at the user's current local hour. */
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
    return NextResponse.json({ sent: 0 })
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

  let sent = 0
  for (const pref of prefs) {
    const tz = pref.timezone || 'America/New_York'
    const localHour = hourInTimezone(tz)
    const todayLocal = todayInTimezone(tz)
    const profile = profileByUserId[pref.user_id]
    if (!profile?.email) continue

    const habits = await getHabitsForReminderAtHour(
      supabase,
      pref.user_id,
      todayLocal,
      localHour
    )
    if (habits.length === 0) continue

    const unsubscribeUrl = appUrl
      ? `${appUrl.replace(/\/$/, '')}/unsubscribe?token=${pref.unsubscribe_token}`
      : ''
    const todayUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/dashboard/today` : '/dashboard/today'
    const timeLabel = formatTimeLabel(localHour)
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
    })

    if (!sendError) sent++
  }

  return NextResponse.json({ sent })
}
