'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      void Promise.resolve(
        supabase.from('profiles').select('display_name').eq('id', user.id).single()
      ).then(({ data }) => {
        setDisplayName(data?.display_name ?? '')
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
    const { error: err } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim().slice(0, 50) || '' })
      .eq('id', user.id)
    setSaving(false)
    if (err) {
      setError(err.message)
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
