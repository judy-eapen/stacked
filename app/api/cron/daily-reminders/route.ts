import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getTodayHabitsForUser,
  buildDailyEmailHtml,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function nowInTimezone(timezone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  return { hour, minute }
}

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

function parseReminderTime(t: string): { hour: number; minute: number } {
  const match = String(t).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return { hour: 8, minute: 0 }
  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) }
}

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
    .select('user_id, email_reminder_time, timezone, last_daily_reminder_sent_at, unsubscribe_token')
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
    const now = nowInTimezone(tz)
    const reminder = parseReminderTime(String(pref.email_reminder_time))
    if (now.hour !== reminder.hour || now.minute !== reminder.minute) continue

    const todayLocal = todayInTimezone(tz)
    const lastSent = pref.last_daily_reminder_sent_at
    if (lastSent && String(lastSent) >= todayLocal) continue

    const profile = profileByUserId[pref.user_id]
    if (!profile?.email) continue

    const habits = await getTodayHabitsForUser(supabase, pref.user_id, todayLocal)
    const unsubscribeUrl = appUrl
      ? `${appUrl.replace(/\/$/, '')}/unsubscribe?token=${pref.unsubscribe_token}`
      : ''
    const todayUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/dashboard/today` : '/dashboard/today'
    const html = buildDailyEmailHtml(
      profile.display_name ?? '',
      habits,
      todayUrl,
      unsubscribeUrl
    )

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Stacked <onboarding@resend.dev>',
      to: profile.email,
      subject: "Today's habits – Stacked",
      html,
    })

    if (sendError) continue

    await supabase
      .from('notification_preferences')
      .update({ last_daily_reminder_sent_at: todayLocal })
      .eq('user_id', pref.user_id)
    sent++
  }

  return NextResponse.json({ sent })
}
