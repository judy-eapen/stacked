'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ReviewRow {
  id: string
  review_type: string
  review_date: string
  wins: string | null
  struggles: string | null
  adjustments: string | null
  created_at: string
}

export default function ReviewHistoryPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('reviews')
        .select('id, review_type, review_date, wins, struggles, adjustments, created_at')
        .eq('user_id', user.id)
        .order('review_date', { ascending: false })
        .limit(50)
      if (!cancelled) {
        if (error) setReviews([])
        else setReviews((data ?? []) as ReviewRow[])
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/review" className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
          ← Review
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Review history</h1>
        <p className="text-sm text-gray-500">Past weekly and monthly reviews.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-6 text-center">
          <p className="text-gray-600">No reviews yet.</p>
          <p className="text-sm text-gray-500 mt-1">Write your first review from the Review page.</p>
          <Link href="/dashboard/review/write" className="inline-block mt-3 text-sm font-medium text-[#e87722] hover:underline">
            Write a review →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/review/write?date=${r.review_date}`}
                className="block rounded-xl bg-white border border-gray-200 p-4 hover:border-[#e87722]/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 capitalize">{r.review_type}</span>
                  <span className="text-sm text-gray-500">{r.review_date}</span>
                </div>
                {(r.wins || r.struggles || r.adjustments) && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {[r.wins, r.struggles, r.adjustments].filter(Boolean).join(' · ')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
