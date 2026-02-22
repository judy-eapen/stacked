'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const IDENTITY_PREFIX = 'I am a person who '
const MIN_STATEMENT_LENGTH = 3

const REWARD_OPTIONS = [
  { value: 'check', label: 'Check it off' },
  { value: 'music', label: 'Music' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'other', label: 'Other' },
] as const

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
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)

  const [identityStatement, setIdentityStatement] = useState('')
  const [habitName, setHabitName] = useState('')
  const [habitTwoMin, setHabitTwoMin] = useState('')
  const [cueType, setCueType] = useState<'time' | 'after' | 'location'>('time')
  const [cueValue, setCueValue] = useState('')
  const [reward, setReward] = useState<string>('check')
  const [rewardOther, setRewardOther] = useState('')
  const [bundleWith, setBundleWith] = useState('')

  const [createdIdentityId, setCreatedIdentityId] = useState<string | null>(null)
  const [createdHabitId, setCreatedHabitId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [firstDone, setFirstDone] = useState(false)

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
    if (!loading && identities.length > 0 && step === 0) {
      router.replace('/dashboard')
    }
  }, [loading, identities.length, step, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e87722] border-t-transparent" />
        <p className="text-sm text-gray-500 mt-3">Loading…</p>
      </div>
    )
  }

  const canSubmitStep0 = identityStatement.trim().length >= MIN_STATEMENT_LENGTH
  const canSubmitStep1 = habitName.trim().length >= 1 && habitTwoMin.trim().length >= 1

  const submitStep0 = async () => {
    if (!canSubmitStep0) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const completion = identityStatement.trim()
    const statement = (IDENTITY_PREFIX + completion + (completion.endsWith('.') ? '' : '.')).slice(0, 500)
    const { data: row, error: insertErr } = await supabase
      .from('identities')
      .insert({ user_id: user.id, statement, sort_order: 0 })
      .select('id')
      .single()
    if (insertErr) {
      setError(insertErr.message)
      setSubmitting(false)
      return
    }
    setCreatedIdentityId(row.id)
    await fetchIdentities()
    setStep(1)
    setSubmitting(false)
  }

  const submitStep1 = async () => {
    if (!canSubmitStep1 || !createdIdentityId) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const name = habitName.trim().slice(0, 200)
    const twoMin = habitTwoMin.trim().slice(0, 200)
    const { data: habitRow, error: insertErr } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        identity_id: createdIdentityId,
        name,
        two_minute_version: twoMin,
        frequency: 'daily',
        sort_order: 0,
      })
      .select('id')
      .single()
    if (insertErr) {
      setError(insertErr.message)
      setSubmitting(false)
      return
    }
    setCreatedHabitId(habitRow.id)
    setStep(2)
    setSubmitting(false)
  }

  const submitStep2 = async () => {
    if (!createdHabitId) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const intention =
      cueType === 'time'
        ? { behavior: habitName.trim().slice(0, 200), time: cueValue.trim().slice(0, 100) || undefined, location: undefined }
        : cueType === 'after'
          ? { behavior: cueValue.trim().slice(0, 200), time: undefined, location: undefined }
          : { behavior: habitName.trim().slice(0, 200), time: undefined, location: cueValue.trim().slice(0, 100) || undefined }
    const designBuild = {
      obvious: { implementation_intention: cueValue.trim().slice(0, 200) || undefined },
      easy: { two_minute_rule: habitTwoMin.trim().slice(0, 200) },
      satisfying: { immediate_reward: reward === 'other' ? rewardOther.trim().slice(0, 200) : REWARD_OPTIONS.find((r) => r.value === reward)?.label ?? 'Check it off' },
      attractive: bundleWith.trim() ? { temptation_bundling: bundleWith.trim().slice(0, 500) } : undefined,
    }
    await supabase
      .from('habits')
      .update({
        implementation_intention: intention.behavior || intention.time || intention.location ? intention : null,
        design_build: designBuild,
        updated_at: new Date().toISOString(),
      })
      .eq('id', createdHabitId)
      .eq('user_id', user.id)
    setStep(3)
    setSubmitting(false)
  }

  const completeStep3 = async () => {
    if (!createdHabitId) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    await supabase
      .from('habits')
      .update({
        last_completed_date: today,
        current_streak: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', createdHabitId)
      .eq('user_id', user.id)
    setFirstDone(true)
    setSubmitting(false)
  }

  const identityStatementDisplay = identities.find((i) => i.id === createdIdentityId)?.statement ?? (IDENTITY_PREFIX + identityStatement.trim())

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          {step === 0 && 'Who do you want to become?'}
          {step === 1 && "What's one habit that proves this identity?"}
          {step === 2 && 'Configure the 4 Laws (quick)'}
          {step === 3 && 'Do the tiny version now'}
          {step === 4 && 'You cast 1 vote for your identity'}
        </h1>
        <p className="text-sm text-gray-500">
          {step === 0 && 'Start with one identity. You can add more later.'}
          {step === 1 && 'Name the habit and its 2-minute version (required).'}
          {step === 2 && 'Cue, tiny version, reward. About 60 seconds.'}
          {step === 3 && 'Tap Done when you do it. This is your first win.'}
          {step === 4 && 'Want to add another identity? Or go to your dashboard.'}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {step === 0 && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <div className="flex flex-wrap items-baseline gap-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
            <span className="text-sm text-gray-500">{IDENTITY_PREFIX}</span>
            <input
              type="text"
              placeholder="e.g. move every day"
              value={identityStatement}
              onChange={(e) => setIdentityStatement(e.target.value)}
              className="flex-1 min-w-[120px] bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          {identityStatement.trim().length > 0 && identityStatement.trim().length < MIN_STATEMENT_LENGTH && (
            <p className="text-xs text-amber-600">At least {MIN_STATEMENT_LENGTH} characters.</p>
          )}
          <p className="text-xs text-gray-500">You can add another identity later from Identities.</p>
          <button
            type="button"
            onClick={submitStep0}
            disabled={!canSubmitStep0 || submitting}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Next'}
          </button>
        </div>
      )}

      {step === 1 && createdIdentityId && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <p className="text-xs text-gray-600">&ldquo;{identities.find((i) => i.id === createdIdentityId)?.statement}&rdquo;</p>
          <input
            type="text"
            placeholder="Habit name"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="2-minute version (required)"
            value={habitTwoMin}
            onChange={(e) => setHabitTwoMin(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
          />
          {habitName.trim() && !habitTwoMin.trim() && (
            <p className="text-xs text-amber-600">Add a 2-minute version to continue.</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
              Back
            </button>
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

      {step === 2 && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <p className="text-xs font-medium text-gray-700">Obvious: when will you do it?</p>
          <select
            value={cueType}
            onChange={(e) => setCueType(e.target.value as 'time' | 'after' | 'location')}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
          >
            <option value="time">At a specific time</option>
            <option value="after">After something else</option>
            <option value="location">In a specific place</option>
          </select>
          <input
            type="text"
            placeholder={cueType === 'time' ? 'e.g. 7:00 AM' : cueType === 'after' ? 'e.g. After I pour coffee' : 'e.g. In my home office'}
            value={cueValue}
            onChange={(e) => setCueValue(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
          />

          <p className="text-xs font-medium text-gray-700 mt-4">Easy: your tiny version</p>
          <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">{habitTwoMin || '—'}</p>

          <p className="text-xs font-medium text-gray-700 mt-4">Satisfying: pick a reward</p>
          <select
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
          >
            {REWARD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {reward === 'other' && (
            <input
              type="text"
              placeholder="Your reward"
              value={rewardOther}
              onChange={(e) => setRewardOther(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm mt-1"
            />
          )}

          <p className="text-xs font-medium text-gray-700 mt-4">Attractive: bundle with something you enjoy? (optional)</p>
          <input
            type="text"
            placeholder="e.g. Only while listening to my podcast"
            value={bundleWith}
            onChange={(e) => setBundleWith(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
          />

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
              Back
            </button>
            <button
              type="button"
              onClick={submitStep2}
              disabled={submitting}
              className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-4">
          {!firstDone ? (
            <>
              <p className="text-sm text-gray-700">Do the tiny version now: &ldquo;{habitTwoMin}&rdquo;</p>
              <button
                type="button"
                onClick={completeStep3}
                disabled={submitting}
                className="w-full h-12 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] disabled:opacity-50"
              >
                {submitting ? '…' : 'Done'}
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900">You cast 1 vote for {identityStatementDisplay}</p>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full h-10 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
              >
                Next
              </button>
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-4">
          <p className="text-sm text-gray-500">Want to add another identity? You can do it anytime from Identities.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors gap-2"
            >
              Go to dashboard
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/dashboard/identities?add=1"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Add another identity
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
