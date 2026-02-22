'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
]

function PushToggle({
  userId,
  pushEnabled,
  onToggle,
}: {
  userId: string | null
  pushEnabled: boolean
  onToggle: (v: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const appId = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID : ''

  useEffect(() => {
    if (!appId) return
    if (document.querySelector('script[data-onesignal]')) return
    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    script.setAttribute('data-onesignal', '1')
    document.head.appendChild(script)
  }, [appId])

  async function handleEnable() {
    if (!appId || !userId) return
    setLoading(true)
    try {
      const OneSignalDeferred = (window as unknown as { OneSignalDeferred?: ((fn: (OneSignal: unknown) => Promise<void>) => void)[] }).OneSignalDeferred
      if (!OneSignalDeferred) {
        setLoading(false)
        return
      }
      await new Promise<void>((resolve, reject) => {
        OneSignalDeferred.push(async (OneSignal: unknown) => {
          try {
            const OS = OneSignal as { init: (opts: { appId: string; allowLocalhostAsSecureOrigin?: boolean }) => Promise<void>; login: (id: string) => Promise<void>; Notifications: { requestPermission: () => Promise<boolean> } }
            await OS.init({
              appId,
              allowLocalhostAsSecureOrigin: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
            })
            await OS.login(userId)
            const granted = await OS.Notifications.requestPermission()
            if (granted) {
              const res = await fetch('/api/push/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
              if (res.ok) onToggle(true)
            }
          } catch (e) {
            reject(e)
          }
          resolve()
        })
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id="pushEnabled"
        checked={pushEnabled}
        onChange={(e) => {
          if (e.target.checked) handleEnable()
          else onToggle(false)
        }}
        disabled={loading || !appId}
        className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
      />
      <label htmlFor="pushEnabled" className="text-sm font-medium text-gray-700">
        {pushEnabled ? 'Push enabled' : 'Enable push'}
      </label>
      {!appId && <span className="text-xs text-gray-500">(Set NEXT_PUBLIC_ONESIGNAL_APP_ID)</span>}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true)
  const [emailReminderTime, setEmailReminderTime] = useState('08:00')
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(true)
  const [timezone, setTimezone] = useState('America/New_York')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)
      Promise.all([
        supabase.from('profiles').select('display_name').eq('id', user.id).single(),
        supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ]).then(async ([profileRes, prefsRes]) => {
        setDisplayName(profileRes.data?.display_name ?? '')
        const prefs = prefsRes.data
        if (prefs) {
          setEmailRemindersEnabled(prefs.email_reminders_enabled ?? true)
          const t = String(prefs.email_reminder_time ?? '08:00').slice(0, 5)
          setEmailReminderTime(t.length === 5 ? t : '08:00')
          setEmailWeeklySummary(prefs.email_weekly_summary ?? true)
          setTimezone(prefs.timezone ?? 'America/New_York')
          setPushEnabled(prefs.push_enabled ?? false)
        } else {
          await supabase.from('notification_preferences').insert({
            user_id: user.id,
            email_reminders_enabled: true,
            email_reminder_time: '08:00',
            email_weekly_summary: true,
            timezone: 'America/New_York',
          })
        }
        setPrefsLoaded(true)
      }).finally(() => setLoading(false))
    })
  }, [])

  async function handleSave() {
    setError(null)
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const [{ error: profileErr }, { error: prefsErr }] = await Promise.all([
      supabase.from('profiles').update({ display_name: displayName.trim().slice(0, 50) || '' }).eq('id', user.id),
      supabase.from('notification_preferences').upsert({
        user_id: user.id,
        email_reminders_enabled: emailRemindersEnabled,
        email_reminder_time: emailReminderTime + ':00',
        email_weekly_summary: emailWeeklySummary,
        timezone: timezone,
        push_enabled: pushEnabled,
      }, { onConflict: 'user_id' }),
    ])
    setSaving(false)
    if (profileErr || prefsErr) {
      setError(profileErr?.message ?? prefsErr?.message ?? 'Failed to save')
      return
    }
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 3000)
    router.refresh()
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account</p>
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account</p>
      </div>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Profile</h2>
        {error && (
          <p className="text-sm text-red-600 mb-3 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you appear to your accountability partner"
            maxLength={50}
            className="w-full max-w-sm h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 focus:border-[#e87722]"
          />
          <p className="text-xs text-gray-500 mt-1">Your partner sees this name when viewing your shared habits.</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt !== null && (
            <span className="text-sm text-green-600 font-medium" role="status">
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Email</h2>
        <p className="text-sm text-gray-600 mb-3">Daily reminder and weekly summary. Unsubscribe links are in every email.</p>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={emailRemindersEnabled}
            onChange={(e) => setEmailRemindersEnabled(e.target.checked)}
            className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
          />
          <span className="text-sm font-medium text-gray-700">Daily reminder</span>
        </label>
        {emailRemindersEnabled && (
          <div className="mb-3">
            <label htmlFor="reminderTime" className="block text-xs font-medium text-gray-700 mb-1">Preferred time (saved for when we support more frequent delivery)</label>
            <input
              id="reminderTime"
              type="time"
              value={emailReminderTime}
              onChange={(e) => setEmailReminderTime(e.target.value)}
              className="h-10 px-3 rounded-lg border border-gray-200 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Reminders are sent once per day.</p>
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="timezone" className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full max-w-sm h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={emailWeeklySummary}
            onChange={(e) => setEmailWeeklySummary(e.target.checked)}
            className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
          />
          <span className="text-sm font-medium text-gray-700">Weekly summary (Monday)</span>
        </label>
        <p className="text-xs text-gray-500">Changes take effect the next day.</p>
      </div>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Push notifications</h2>
        <p className="text-sm text-gray-600 mb-3">Browser push once per day. Enable and allow when prompted.</p>
        <PushToggle
          userId={userId}
          pushEnabled={pushEnabled}
          onToggle={setPushEnabled}
        />
      </div>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Data</h2>
        <p className="text-sm text-gray-600 mb-3">Export all your habit completions as a CSV file.</p>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch('/api/export', { credentials: 'include' })
            if (!res.ok) return
            const blob = await res.blob()
            const disposition = res.headers.get('Content-Disposition')
            const match = disposition?.match(/filename="([^"]+)"/)
            const name = match?.[1] ?? `stacked-export-${new Date().toISOString().slice(0, 10)}.csv`
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = name
            a.click()
            URL.revokeObjectURL(a.href)
          }}
          className="inline-block h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
        >
          Export my data
        </button>
      </div>

      <div className="rounded-xl bg-white border border-gray-200/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Account</h2>
        <p className="text-sm text-gray-600 mb-3">Sign out of Stacked on this device.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-block h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
