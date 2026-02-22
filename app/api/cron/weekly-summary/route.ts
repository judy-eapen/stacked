import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getWeeklySummaryForUser,
  buildWeeklyEmailHtml,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Get last Monday (YYYY-MM-DD) in UTC. */
function getLastMonday(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - diff - 7)
  return d.toISOString().slice(0, 10)
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

  const weekStart = getLastMonday()
  const weekLabel = `week of ${weekStart}`

  const supabase = createAdminClient()
  const resend = new Resend(resendKey)

  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id, unsubscribe_token')
    .eq('email_weekly_summary', true)

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
    const profile = profileByUserId[pref.user_id]
    if (!profile?.email) continue

    const { habits, overallCompletionRate } = await getWeeklySummaryForUser(
      supabase,
      pref.user_id,
      weekStart
    )

    const unsubscribeUrl = appUrl
      ? `${appUrl.replace(/\/$/, '')}/unsubscribe?token=${pref.unsubscribe_token}&type=weekly`
      : ''
    const html = buildWeeklyEmailHtml(
      profile.display_name ?? '',
      habits,
      overallCompletionRate,
      weekLabel,
      appUrl,
      unsubscribeUrl
    )

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Stacked <onboarding@resend.dev>',
      to: profile.email,
      subject: `Your weekly habit summary – ${weekLabel}`,
      html,
    })

    if (!sendError) sent++
  }

  return NextResponse.json({ sent })
}
