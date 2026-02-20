'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  async function handleGoogle() {
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    })
    if (err) {
      setError(err.message)
      return
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <Link href="/" className="absolute top-4 left-4 z-30 text-xs text-gray-500 hover:text-gray-700 underline">
        ← Back to home
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
        <p className="text-sm text-gray-500 m-0 mb-6">Build habits that compound</p>

        {error && (
          <p className="text-sm text-red-600 mb-4 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
            {error}
          </p>
        )}

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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 focus:border-[#e87722]"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              <Link href="/forgot-password" className="text-[#e87722] hover:underline">Forgot password?</Link>
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <span className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full h-11 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Continue with Google
        </button>
        <p className="text-sm text-gray-500 text-center mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-gray-900 underline font-medium">Sign up</Link>
        </p>
      </div>
    </main>
  )
}
