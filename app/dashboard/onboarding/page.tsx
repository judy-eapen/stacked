'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const IDENTITY_PREFIX = 'I am a person who '
const MIN_STATEMENT_LENGTH = 3

interface Identity {
  id: string
  statement: string
  sort_order: number
}

export default function OnboardingPage() {
  const router = useRouter()
  const [identities, setIdentities] = useState<Identity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [statement1, setStatement1] = useState('')
  const [statement2, setStatement2] = useState('')
  const [showSecondIdentity, setShowSecondIdentity] = useState(false)

  const [habitNames, setHabitNames] = useState<Record<string, string>>({})
  const [habitTwoMin, setHabitTwoMin] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const fetchIdentities = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error: err } = await supabase
      .from('identities')
      .select('id, statement, sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
      setIdentities([])
      return
    }
    setIdentities((data ?? []) as Identity[])
    setError(null)
  }, [])

  useEffect(() => {
    fetchIdentities().finally(() => setLoading(false))
  }, [fetchIdentities])

  useEffect(() => {
    if (loading || identities.length === 0) return
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: habits } = await supabase
        .from('habits')
        .select('identity_id')
        .eq('user_id', user.id)
        .not('identity_id', 'is', null)
      const identityIdsWithHabits = new Set((habits ?? []).map((h) => h.identity_id).filter(Boolean))
      const everyIdentityHasHabit = identities.every((idn) => identityIdsWithHabits.has(idn.id))
      if (everyIdentityHasHabit) router.replace('/dashboard')
    }
    check()
  }, [loading, identities, router])

  useEffect(() => {
    if (!loading && step === 2 && identities.length > 0) {
      setHabitNames((prev) => {
        const next = { ...prev }
        identities.forEach((idn) => {
          if (!(idn.id in next)) next[idn.id] = ''
        })
        return next
      })
      setHabitTwoMin((prev) => {
        const next = { ...prev }
        identities.forEach((idn) => {
          if (!(idn.id in next)) next[idn.id] = ''
        })
        return next
      })
    }
  }, [loading, step, identities])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e87722] border-t-transparent" />
        <p className="text-sm text-gray-500 mt-3">Loading…</p>
      </div>
    )
  }

  const completion1 = statement1.trim()
  const completion2 = statement2.trim()
  const canSubmitStep1 = completion1.length >= MIN_STATEMENT_LENGTH && (!showSecondIdentity || completion2.length >= MIN_STATEMENT_LENGTH)

  const submitStep1 = async () => {
    if (!canSubmitStep1) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const statements: string[] = []
    const s1 = (IDENTITY_PREFIX + completion1 + (completion1.endsWith('.') ? '' : '.')).slice(0, 500)
    statements.push(s1)
    if (showSecondIdentity && completion2) {
      const s2 = (IDENTITY_PREFIX + completion2 + (completion2.endsWith('.') ? '' : '.')).slice(0, 500)
      statements.push(s2)
    }
    for (let i = 0; i < statements.length; i++) {
      const { error: insertErr } = await supabase.from('identities').insert({
        user_id: user.id,
        statement: statements[i],
        sort_order: identities.length + i,
      })
      if (insertErr) {
        setError(insertErr.message)
        setSubmitting(false)
        return
      }
    }
    await fetchIdentities()
    setStep(2)
    setStatement1('')
    setHabitNames({})
    setHabitTwoMin({})
    setStatement2('')
    setShowSecondIdentity(false)
    setSubmitting(false)
  }

  const allHabitsValid = identities.length > 0 && identities.every((idn) => {
    const name = (habitNames[idn.id] ?? '').trim().slice(0, 200)
    const twoMin = (habitTwoMin[idn.id] ?? '').trim().slice(0, 200)
    return name.length >= 1 && twoMin.length >= 1
  })

  const submitStep2 = async () => {
    if (!allHabitsValid) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    for (let i = 0; i < identities.length; i++) {
      const idn = identities[i]
      const name = (habitNames[idn.id] ?? '').trim().slice(0, 200)
      const twoMin = (habitTwoMin[idn.id] ?? '').trim().slice(0, 200)
      const { error: insertErr } = await supabase.from('habits').insert({
        user_id: user.id,
        identity_id: idn.id,
        name,
        two_minute_version: twoMin,
        frequency: 'daily',
        sort_order: i,
      })
      if (insertErr) {
        setError(insertErr.message)
        setSubmitting(false)
        return
      }
    }
    setSubmitting(false)
    setStep(3)
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Set your focus
        </h1>
        <p className="text-sm text-gray-500">
          Choose 1–2 identities and one habit to start for each. Every habit needs a 2-minute version.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <p className="text-sm font-medium text-gray-900">Step 1 of 2: Add 1 or 2 identities</p>
          <p className="text-xs text-gray-500">Complete the sentence. At least {MIN_STATEMENT_LENGTH} characters.</p>
          <div className="flex flex-wrap items-baseline gap-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
            <span className="text-sm text-gray-500">{IDENTITY_PREFIX}</span>
            <input
              type="text"
              placeholder="e.g. move every day"
              value={statement1}
              onChange={(e) => setStatement1(e.target.value)}
              className="flex-1 min-w-[120px] bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          {statement1.trim().length > 0 && statement1.trim().length < MIN_STATEMENT_LENGTH && (
            <p className="text-xs text-amber-600">Add at least {MIN_STATEMENT_LENGTH} characters.</p>
          )}

          {!showSecondIdentity ? (
            <button
              type="button"
              onClick={() => setShowSecondIdentity(true)}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              + Add a second identity
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
                <span className="text-sm text-gray-500">{IDENTITY_PREFIX}</span>
                <input
                  type="text"
                  placeholder="e.g. read before bed"
                  value={statement2}
                  onChange={(e) => setStatement2(e.target.value)}
                  className="flex-1 min-w-[120px] bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              {statement2.trim().length > 0 && statement2.trim().length < MIN_STATEMENT_LENGTH && (
                <p className="text-xs text-amber-600">Add at least {MIN_STATEMENT_LENGTH} characters.</p>
              )}
              <button
                type="button"
                onClick={() => setShowSecondIdentity(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Remove second identity
              </button>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={submitStep1}
              disabled={!canSubmitStep1 || submitting}
              className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && identities.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm font-medium text-gray-900">Step 2 of 2: One habit per identity (2-minute version required)</p>
          {identities.map((idn) => (
            <div key={idn.id} className="rounded-xl bg-white border border-gray-200 p-5 space-y-3">
              <p className="text-xs font-medium text-gray-600">Habit for: &ldquo;{idn.statement}&rdquo;</p>
              <input
                type="text"
                placeholder="Habit name"
                value={habitNames[idn.id] ?? ''}
                onChange={(e) => setHabitNames((prev) => ({ ...prev, [idn.id]: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                type="text"
                placeholder="2-minute version (required)"
                value={habitTwoMin[idn.id] ?? ''}
                onChange={(e) => setHabitTwoMin((prev) => ({ ...prev, [idn.id]: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
              {(habitNames[idn.id] ?? '').trim() && !(habitTwoMin[idn.id] ?? '').trim() && (
                <p className="text-xs text-amber-600">Add a 2-minute version to continue.</p>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submitStep2}
              disabled={!allHabitsValid || submitting}
              className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl bg-white border border-gray-200 p-6 text-center space-y-4">
          <p className="text-lg font-medium text-gray-900">You&rsquo;re all set</p>
          <p className="text-sm text-gray-500">
            You have {identities.length} identity{identities.length === 1 ? '' : 'ies'} and one habit to start for each. Next: add more habits or rate your current ones on the Scorecard.
          </p>
          <Link
            href="/dashboard/scorecard"
            className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors gap-2"
          >
            Go to Scorecard
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/dashboard"
            className="block text-sm text-gray-600 hover:text-gray-900"
          >
            Dashboard home
          </Link>
        </div>
      )}

    </div>
  )
}
