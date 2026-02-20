'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DisplayNamePage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { error: err } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim().slice(0, 50) || '' })
      .eq('id', user.id)
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
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
          <Link href="/dashboard" className="text-[#e87722] hover:underline">Skip for now</Link>
          {' '}(you&apos;ll be asked again until set)
        </p>
      </div>
    </div>
  )
}
