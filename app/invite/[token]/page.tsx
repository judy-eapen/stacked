'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = typeof params.token === 'string' ? params.token : ''
  const [status, setStatus] = useState<'checking' | 'accepting' | 'done' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Invalid invite link')
      return
    }

    const run = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`)
        return
      }

      setStatus('accepting')
      const res = await fetch('/api/partnerships/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_token: token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setError(data.error || 'Something went wrong')
        return
      }
      setStatus('done')
      router.replace('/dashboard/partners')
      router.refresh()
    }

    void run()
  }, [token, router])

  if (status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div
          className="max-w-md w-full rounded-2xl bg-white border border-gray-200 shadow-lg p-8"
          style={{
            background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)',
          }}
        >
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invite link problem</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard/partners"
            className="inline-block rounded-lg bg-[#e87722] text-white font-medium px-4 py-2 hover:bg-[#d96b1e]"
          >
            Go to Partners
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-600">
          {status === 'checking' && 'Checking…'}
          {status === 'accepting' && 'Accepting invitation…'}
          {status === 'done' && 'Redirecting…'}
        </p>
      </div>
    </main>
  )
}
