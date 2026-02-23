'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getThisWeekBounds, getLastWeekBounds, countVotesInRange } from '@/lib/identityMetrics'
import { BlockersSection } from '@/components/blockers-section'

interface HabitRow {
  id: string
  name: string
  two_minute_version: string | null
  last_completed_date: string | null
  current_streak: number
  sort_order: number
}

interface IdentityDetail {
  id: string
  statement: string
  sort_order: number
  votes_this_week: number
  trend_delta: number | null
  habits: HabitRow[]
}

function momentumPct(votesThisWeek: number, habitCount: number): number {
  if (habitCount === 0) return 0
  const maxVotes = habitCount * 7
  return Math.min(100, Math.round((votesThisWeek / maxVotes) * 100))
}

export default function IdentityDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const identityId = params?.identityId as string
  const showAdd = searchParams?.get('add') === '1'
  const showBlockers = searchParams?.get('blockers') === '1'

  const [identity, setIdentity] = useState<IdentityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blockerError, setBlockerError] = useState<string | null>(null)

  const fetchIdentity = useCallback(async () => {
    if (!identityId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [idnRes, habitsRes] = await Promise.all([
      supabase.from('identities').select('id, statement, sort_order').eq('id', identityId).eq('user_id', user.id).single(),
      supabase.from('habits').select('id, name, two_minute_version, last_completed_date, current_streak, sort_order').eq('user_id', user.id).eq('identity_id', identityId).is('archived_at', null).order('sort_order', { ascending: true }),
    ])
    if (idnRes.error || !idnRes.data) {
      setError(idnRes.error?.message ?? 'Identity not found')
      setIdentity(null)
      setLoading(false)
      return
    }
    const habits = (habitsRes.data ?? []) as HabitRow[]
    const thisWeek = getThisWeekBounds()
    const lastWeek = getLastWeekBounds()
    const withCompletion = habits.filter((h) => h.last_completed_date)
    const votes_this_week = countVotesInRange(withCompletion, thisWeek)
    const votes_last_week = countVotesInRange(withCompletion, lastWeek)
    setIdentity({
      id: idnRes.data.id,
      statement: idnRes.data.statement,
      sort_order: idnRes.data.sort_order,
      votes_this_week,
      trend_delta: votes_this_week - votes_last_week,
      habits,
    })
    setError(null)
    setLoading(false)
  }, [identityId])

  useEffect(() => {
    fetchIdentity()
  }, [fetchIdentity])

  useEffect(() => {
    if (showBlockers && identity) {
      const el = document.getElementById('blockers-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [showBlockers, identity])

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (error || !identity) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/identities" className="text-sm text-[#e87722] hover:underline">← Back to identities</Link>
        <p className="text-sm text-red-600" role="alert">{error ?? 'Not found'}</p>
      </div>
    )
  }

  const pct = momentumPct(identity.votes_this_week, identity.habits.length)

  return (
    <div className="space-y-6">
      <Link href="/dashboard/identities" className="text-sm text-[#e87722] hover:underline">← Back to identities</Link>

      {(error || blockerError) && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error ?? blockerError}
        </p>
      )}

      {/* Scoreboard */}
      <div className="rounded-xl bg-white border border-gray-200/80 p-5 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">{identity.statement}</h1>
        <p className="text-sm text-gray-600">This week: {identity.votes_this_week} votes</p>
        <p className="text-xs text-gray-500">
          {identity.trend_delta !== null
            ? identity.trend_delta >= 0
              ? `↑ +${identity.trend_delta} vs last week`
              : `↓ ${identity.trend_delta} vs last week`
            : 'Trend: —'}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-[#e87722]/80" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
          </div>
          <span className="text-xs text-gray-600 shrink-0">Momentum: {pct}%</span>
        </div>
      </div>

      {/* Habits for this identity */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Reinforcing habits</h2>
          <Link
            href={`/dashboard/habits?identity=${identity.id}&mode=reinforce&new=1`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
          >
            + Add reinforcing habit
          </Link>
        </div>
        {identity.habits.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500">No habits linked yet. Add one to start voting for this identity.</p>
            <Link
              href={`/dashboard/habits?identity=${identity.id}&mode=reinforce&new=1`}
              className="mt-3 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
            >
              Add your first habit
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {identity.habits.map((h) => (
              <li key={h.id} className="rounded-xl bg-white border border-gray-200/80 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/dashboard/habits/${h.id}`} className="font-medium text-gray-900 hover:text-[#e87722]">{h.name}</Link>
                  {h.two_minute_version && <p className="text-xs text-gray-600 mt-0.5">2-min: {h.two_minute_version}</p>}
                  <p className="text-xs text-gray-500 mt-1">Streak: {h.current_streak}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/dashboard/habits?identity=${identity.id}`} className="text-sm text-[#e87722] hover:underline">Edit</Link>
                  <Link href={`/dashboard/habits/${h.id}/contract`} className="text-xs text-gray-500 hover:text-[#e87722]">Contract</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Blockers */}
      <div id="blockers-section">
        <BlockersSection identityId={identity.id} onError={setBlockerError} onUpdated={fetchIdentity} />
      </div>
    </div>
  )
}
