'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function getWeekStart(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export function ReviewHubClient() {
  const [showWeeklyPrompt, setShowWeeklyPrompt] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const weekStart = getWeekStart(new Date())
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setChecking(false)
        return
      }
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('review_type', 'weekly')
        .eq('review_date', weekStart)
        .maybeSingle()
      setShowWeeklyPrompt(!data)
      setChecking(false)
    })
  }, [])

  return (
    <>
      {!checking && showWeeklyPrompt && (
        <div className="rounded-xl bg-[#e87722]/10 border border-[#e87722]/30 p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-900">
            You haven&rsquo;t reviewed this week. Write a review to reflect on your habits.
          </p>
          <Link
            href="/dashboard/review/write"
            className="shrink-0 h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
          >
            Write a review
          </Link>
        </div>
      )}

      <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-900">Ways to use the scorecard</h2>
          <Link
            href="/dashboard/review/write"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e]"
          >
            Write a review
          </Link>
        </div>
        <ul className="space-y-3">
          <li>
            <Link
              href="/dashboard/review/weekly"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">Weekly review</span>
              <span className="block text-xs text-gray-500 mt-0.5">Rate this week (= / −), see friction and advice, apply one fix.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/scorecard"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">Map your day</span>
              <span className="block text-xs text-gray-500 mt-0.5">List habits and rate them + / − / = by time of day. Recalibrate when you need a reset.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/reset"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">I&rsquo;m stuck — reset</span>
              <span className="block text-xs text-gray-500 mt-0.5">60 seconds: mini-scorecard, pick one habit, shrink it, restart.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/monthly"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">Monthly identity reflection</span>
              <span className="block text-xs text-gray-500 mt-0.5">Are your habits still aligned with who you want to become?</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/history"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">Review history</span>
              <span className="block text-xs text-gray-500 mt-0.5">Past weekly and monthly reviews.</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  )
}
