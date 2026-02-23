import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']
const STATE_COOKIE = 'stacked_calendar_oauth_state'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/calendar/callback` : null)
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and redirect URI must be set' },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  })

  return NextResponse.redirect(authUrl)
}
