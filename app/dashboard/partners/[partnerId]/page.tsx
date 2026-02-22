'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Habit = {
  id: string
  name: string
  identity: string | null
  current_streak: number
  longest_streak: number
  completed_today: boolean
  completions_this_week: number
  contract: {
    commitment: string
    consequence: string | null
    start_date: string
    end_date: string | null
  } | null
}

type SharedData = {
  partner: { display_name: string; avatar_url: string | null }
  habits: Habit[]
  latest_review: {
    review_type: string
    review_date: string
    wins: string
    struggles: string
  } | null
  last_active: string | null
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
}

export default function PartnerViewPage() {
  const params = useParams()
  const router = useRouter()
  const partnerId = typeof params.partnerId === 'string' ? params.partnerId : ''
  const [data, setData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!partnerId) {
      setLoading(false)
      return
    }
    fetch(`/api/partners/${partnerId}/shared`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'No access' : 'Failed to load')
        return r.json()
      })
      .then(setData)
      .catch((e) => {
        setError(e.message)
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [partnerId])

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">{error || 'Partner not found'}</p>
        <Link href="/dashboard/partners" className="text-[#e87722] hover:underline">
          Back to Partners
        </Link>
      </div>
    )
  }

  const lastActiveDays = data.last_active ? daysAgo(data.last_active) : null
  const inactiveWarning = lastActiveDays !== null && lastActiveDays > 3

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/partners" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Partners
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            {data.partner.display_name || 'Partner'}
          </h1>
          <p className="text-sm text-gray-500">Read-only view of shared habits</p>
        </div>
      </div>

      {inactiveWarning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          Hasn&apos;t checked in recently (last active {lastActiveDays} days ago).
        </div>
      )}

      {data.habits.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200/80 p-6 text-center text-gray-500">
          No shared habits yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.habits.map((h) => (
            <li
              key={h.id}
              className="rounded-xl bg-white border border-gray-200/80 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{h.name}</p>
                  {h.identity && (
                    <p className="text-sm text-gray-500 mt-0.5">{h.identity}</p>
                  )}
                </div>
                <div className="text-right text-sm shrink-0">
                  <span className="text-gray-600">Streak {h.current_streak}</span>
                  {h.longest_streak > h.current_streak && (
                    <span className="text-gray-400 ml-1">(best {h.longest_streak})</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-sm text-gray-500">
                <span>{h.completed_today ? 'Done today' : 'Not done today'}</span>
                <span>{h.completions_this_week} this week</span>
              </div>
              {h.contract && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                  <p className="text-gray-700">{h.contract.commitment}</p>
                  {h.contract.consequence && (
                    <p className="text-gray-500 mt-1">Consequence: {h.contract.consequence}</p>
                  )}
                  <p className="text-gray-400 mt-1">
                    {h.contract.start_date} – {h.contract.end_date || 'ongoing'}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.latest_review && (
        <div className="rounded-xl bg-white border border-gray-200/80 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Latest review ({data.latest_review.review_type}, {data.latest_review.review_date})
          </h2>
          {data.latest_review.wins && (
            <p className="text-sm text-gray-700 mb-2"><strong>Wins:</strong> {data.latest_review.wins}</p>
          )}
          {data.latest_review.struggles && (
            <p className="text-sm text-gray-600"><strong>Struggles:</strong> {data.latest_review.struggles}</p>
          )}
        </div>
      )}
    </div>
  )
}
