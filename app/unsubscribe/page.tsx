'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const done = searchParams.get('done')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    done === '1' ? 'done' : token ? 'idle' : 'error'
  )

  useEffect(() => {
    if (done === '1') {
      setStatus('done')
      return
    }
    if (!token) {
      setStatus('error')
      return
    }
    setStatus('loading')
    const url = `/api/unsubscribe?token=${encodeURIComponent(token)}${type ? `&type=${encodeURIComponent(type)}` : ''}`
    fetch(url, { method: 'GET', redirect: 'manual' })
      .then((r) => {
        if (r.type === 'opaqueredirect' || r.status === 0) return
        return r.json()
      })
      .then((data) => {
        if (data?.ok) setStatus('done')
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token, type, done])

  if (status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-white border border-gray-200 shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid link</h1>
          <p className="text-gray-600 mb-6">This unsubscribe link is invalid or has expired.</p>
          <Link href="/dashboard/settings" className="text-[#e87722] font-medium hover:underline">
            Go to Settings
          </Link>
        </div>
      </main>
    )
  }

  if (status === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-white border border-gray-200 shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">You’re unsubscribed</h1>
          <p className="text-gray-600 mb-6">
            {type === 'weekly'
              ? "You won't receive weekly summary emails anymore."
              : "You won't receive daily reminder emails anymore."}
          </p>
          <Link href="/dashboard/settings" className="text-[#e87722] font-medium hover:underline">
            Notification settings
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <p className="text-gray-500">Loading…</p>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500">Loading…</p>
      </main>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
