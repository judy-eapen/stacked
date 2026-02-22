'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Habit {
  id: string
  name: string
  two_minute_version: string | null
  current_streak: number
}

export default function ResetPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [step, setStep] = useState<'pick' | 'shrink' | 'done'>('pick')
  const [twoMinuteDraft, setTwoMinuteDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHabits = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error: err } = await supabase
      .from('habits')
      .select('id, name, two_minute_version, current_streak')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
      setHabits([])
    } else {
      setHabits((data ?? []) as Habit[])
    }
    setError(null)
  }, [])

  useEffect(() => {
    fetchHabits().finally(() => setLoading(false))
  }, [fetchHabits])

  const selectedHabit = selectedId ? habits.find((h) => h.id === selectedId) : null

  const handleShrinkSave = async () => {
    if (!selectedId || !twoMinuteDraft.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error: err } = await supabase
      .from('habits')
      .update({
        two_minute_version: twoMinuteDraft.trim().slice(0, 200),
        current_streak: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedId)
      .eq('user_id', user.id)
    if (err) setError(err.message)
    else setStep('done')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/review" className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
            ← Review
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">I&rsquo;m stuck — reset</h1>
          <p className="text-sm text-gray-500">Pick one habit, shrink it, restart.</p>
        </div>
        <p className="text-sm text-gray-500">You have no active habits. Add habits first.</p>
        <Link href="/dashboard/habits" className="text-sm font-medium text-[#e87722] hover:underline">
          Go to Habits →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/review" className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
          ← Review
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Let&rsquo;s reset. 60 seconds.</h1>
        <p className="text-sm text-gray-500">Last week: pick one habit, shrink it, restart.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {step === 'pick' && (
        <>
          <p className="text-sm font-medium text-gray-700">Pick one to focus on:</p>
          <ul className="space-y-2">
            {habits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(h.id)
                    setTwoMinuteDraft(h.two_minute_version ?? '')
                    setStep('shrink')
                  }}
                  className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 hover:border-[#e87722]/50 hover:bg-[#e87722]/5 transition-colors"
                >
                  <span className="font-medium text-gray-900">{h.name}</span>
                  <span className="text-gray-500 text-sm ml-2">−</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {step === 'shrink' && selectedHabit && (
        <>
          <p className="text-sm font-medium text-gray-700">Shrink it — set a 2-minute version for &ldquo;{selectedHabit.name}&rdquo;</p>
          <input
            type="text"
            placeholder="2-minute version"
            value={twoMinuteDraft}
            onChange={(e) => setTwoMinuteDraft(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep('pick'); setSelectedId(null); setTwoMinuteDraft(''); }}
              className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleShrinkSave}
              disabled={!twoMinuteDraft.trim() || saving}
              className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Restart'}
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <p className="text-sm text-gray-700">You restarted with a 2-minute version. Use it today.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium"
          >
            Done
          </Link>
        </>
      )}
    </div>
  )
}
