'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function getFirstOfMonth(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'
}

export default function MonthlyReviewPage() {
  const [identities, setIdentities] = useState<{ id: string; statement: string }[]>([])
  const [identityReflection, setIdentityReflection] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const monthStart = getFirstOfMonth(new Date())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      const [identitiesRes, reviewRes] = await Promise.all([
        supabase.from('identities').select('id, statement').eq('user_id', user.id).order('sort_order', { ascending: true }),
        supabase.from('reviews').select('identity_reflection').eq('user_id', user.id).eq('review_type', 'monthly').eq('review_date', monthStart).maybeSingle(),
      ])
      setIdentities((identitiesRes.data ?? []) as { id: string; statement: string }[])
      if (reviewRes.data?.identity_reflection) setIdentityReflection(reviewRes.data.identity_reflection)
      setLoading(false)
    })
  }, [monthStart])

  async function handleSave() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('reviews').upsert(
      {
        user_id: user.id,
        review_type: 'monthly',
        review_date: monthStart,
        identity_reflection: identityReflection.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,review_type,review_date' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/review" className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
          ← Review
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Monthly identity reflection</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}. Are your habits still aligned with who you want to become?
        </p>
      </div>

      {identities.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Your identities</p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {identities.map((i) => (
              <li key={i.id}>{i.statement}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <label htmlFor="monthly-reflection" className="block text-sm font-medium text-gray-700 mb-2">
          Reflection
        </label>
        <textarea
          id="monthly-reflection"
          rows={4}
          value={identityReflection}
          onChange={(e) => setIdentityReflection(e.target.value)}
          placeholder="Are you becoming who you want to be? What’s working? What needs to change?"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
        </div>
      </div>
    </div>
  )
}
