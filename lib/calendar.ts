/**
 * Phase 6c: Google Calendar API helpers. Build event payload from habit; create/update/delete events.
 */

import { google } from 'googleapis'
import { decrypt } from '@/lib/encrypt'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

export type CalendarConnection = {
  google_refresh_token: string
  google_calendar_id: string | null
}

export function getCalendarClient(encryptedRefreshToken: string, calendarId: string | null) {
  const refreshToken = decrypt(encryptedRefreshToken)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')
  }
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || undefined
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const targetCalendarId = calendarId || 'primary'
  return { calendar, targetCalendarId }
}

/** Parse hour (0-23) and minute (0-59) from implementation_intention.time; default 8:00. */
function parseTime(intention: { time?: string } | null): { hour: number; minute: number } {
  if (!intention?.time) return { hour: 8, minute: 0 }
  const t = String(intention.time).toLowerCase()
  const hourMin = t.match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i)
  if (hourMin) {
    let h = parseInt(hourMin[1], 10)
    const m = Math.min(59, parseInt(hourMin[2], 10) || 0)
    if (hourMin[3] === 'pm' && h < 12) h += 12
    if (hourMin[3] === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23) return { hour: h, minute: m }
  }
  const hourOnly = t.match(/(\d{1,2})\s*(am|pm)?/i)
  if (hourOnly) {
    let h = parseInt(hourOnly[1], 10)
    if (hourOnly[2] === 'pm' && h < 12) h += 12
    if (hourOnly[2] === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23) return { hour: h, minute: 0 }
  }
  if (t.includes('morning')) return { hour: 8, minute: 0 }
  if (t.includes('noon') || t.includes('afternoon')) return { hour: 12, minute: 0 }
  if (t.includes('evening') || t.includes('night')) return { hour: 18, minute: 0 }
  return { hour: 8, minute: 0 }
}

/** Build event summary and description from habit (name, two-minute version, stack context). */
function eventSummaryAndDescription(habit: {
  name: string
  two_minute_version: string | null
  implementation_intention: { behavior?: string; time?: string; location?: string } | null
}): { summary: string; description: string } {
  const summary = habit.name
  const parts: string[] = []
  if (habit.two_minute_version?.trim()) {
    parts.push(`Two-minute version: ${habit.two_minute_version.trim()}`)
  }
  if (habit.implementation_intention?.behavior?.trim()) {
    parts.push(`After: ${habit.implementation_intention.behavior.trim()}`)
  }
  if (habit.implementation_intention?.location?.trim()) {
    parts.push(`Where: ${habit.implementation_intention.location.trim()}`)
  }
  const description = parts.length ? parts.join('\n') : 'Habit from Stacked'
  return { summary, description }
}

/**
 * Build Google Calendar event resource for a habit: recurring daily at intention time in timezone.
 * timezone: IANA e.g. America/New_York
 */
export function habitToEventPayload(
  habit: {
    name: string
    two_minute_version: string | null
    implementation_intention: { behavior?: string; time?: string; location?: string } | null
  },
  timezone: string
): { summary: string; description: string; start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string }; recurrence: string[] } {
  const { hour, minute } = parseTime(habit.implementation_intention ?? null)
  const { summary, description } = eventSummaryAndDescription(habit)
  const pad = (n: number) => String(n).padStart(2, '0')
  const startTime = `${pad(hour)}:${pad(minute)}:00`
  let endMin = minute + 30
  let endHour = hour
  if (endMin >= 60) {
    endMin -= 60
    endHour += 1
  }
  if (endHour >= 24) endHour = 0
  const endTime = `${pad(endHour)}:${pad(endMin)}:00`
  const startDateTime = `2020-01-01T${startTime}`
  const endDateTime = `2020-01-01T${endTime}`
  return {
    summary,
    description,
    start: { dateTime: startDateTime, timeZone: timezone },
    end: { dateTime: endDateTime, timeZone: timezone },
    recurrence: ['RRULE:FREQ=DAILY'],
  }
}

export async function createEvent(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  payload: ReturnType<typeof habitToEventPayload>
): Promise<string> {
  const res = await calendar.events.insert({
    calendarId,
    requestBody: payload,
  })
  const id = res.data.id
  if (!id) throw new Error('Google Calendar insert did not return event id')
  return id
}

export async function updateEvent(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  eventId: string,
  payload: ReturnType<typeof habitToEventPayload>
): Promise<void> {
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: payload,
  })
}

export async function deleteEvent(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  eventId: string
): Promise<void> {
  await calendar.events.delete({
    calendarId,
    eventId,
  })
}
