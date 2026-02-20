'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DisplayNamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || '/dashboard'
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function saveAndGo(name: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const toSave = (name || user.email?.split('@')[0] || 'User').trim().slice(0, 50) || 'User'
    // Upsert: create profile if missing (e.g. trigger didn't run), then set display_name
    const { error: err } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email ?? '', display_name: toSave },
        { onConflict: 'id' }
      )
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    window.location.href = nextUrl.startsWith('/') ? nextUrl : '/dashboard'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    await saveAndGo(displayName.trim())
    setLoading(false)
  }

  async function handleSkip() {
    setError(null)
    setLoading(true)
    await saveAndGo('')
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
      }}
    >
      <div className="w-full max-w-md rounded-[20px] bg-white shadow-xl border border-black/6 p-8">
        <div className="flex gap-1.5 mb-2">
          <span className="h-1 w-3 rounded-full bg-[#e87722]" />
          <span className="h-1 w-4 rounded-full bg-[#e87722]" />
          <span className="h-1 w-6 rounded-full bg-[#e87722]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Almost there</h1>
        <p className="text-sm text-gray-500 mb-6">
          We use this so your accountability partner can recognize you. You can change it later in settings.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              placeholder="e.g. Alex"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 focus:border-[#e87722]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="text-[#e87722] hover:underline disabled:opacity-60"
          >
            Skip for now
          </button>
          {' '}(we&apos;ll use your email name; change in settings)
        </p>
      </div>
    </div>
  )
}
