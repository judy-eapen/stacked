'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : ''
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <Link href="/login" className="absolute top-4 left-4 z-30 text-xs text-gray-500 hover:text-gray-700 underline">
        ← Back to login
      </Link>
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
        }}
      />

      <div className="relative z-20 w-full max-w-[400px] rounded-[20px] bg-white shadow-xl border border-black/6 p-8">
        <div className="flex gap-1.5 mb-2">
          <span className="h-1 w-3 rounded-full bg-[#e87722]" />
          <span className="h-1 w-4 rounded-full bg-[#e87722]" />
          <span className="h-1 w-6 rounded-full bg-[#e87722]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 m-0">Stacked</h1>
        <p className="text-sm text-gray-500 m-0 mb-6">Reset your password</p>

        {error && (
          <p className="text-sm text-red-600 mb-4 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
            {error}
          </p>
        )}
        {sent && (
          <p className="text-sm text-green-700 mb-4 p-3 rounded-lg bg-green-50 border border-green-200" role="status">
            Check your email for the reset link.
          </p>
        )}

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 focus:border-[#e87722]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        ) : null}

        <p className="text-sm text-gray-500 text-center mt-5">
          <Link href="/login" className="text-gray-900 underline font-medium">Back to login</Link>
        </p>
      </div>
    </main>
  )
}
