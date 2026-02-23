'use client'

import Link from 'next/link'

interface HabitForGraduation {
  habit_id: string
  habit_name: string
  total_completions?: number
}

const GRADUATION_THRESHOLD = 21

export function GraduationPrompt({
  habits,
  className = '',
}: {
  habits: HabitForGraduation[]
  className?: string
}) {
  const eligible = habits.filter((h) => (h.total_completions ?? 0) >= GRADUATION_THRESHOLD)
  if (eligible.length === 0) return null

  return (
    <div className={`rounded-xl bg-[#e87722]/10 border border-[#e87722]/30 p-4 space-y-2 ${className}`}>
      <p className="text-sm font-medium text-gray-900">Ready to level up?</p>
      <p className="text-sm text-gray-600">
        You&rsquo;ve completed these habits {GRADUATION_THRESHOLD}+ times. Consider expanding beyond the 2-minute version.
      </p>
      <ul className="mt-1 text-sm text-gray-700 list-disc list-inside">
        {eligible.map((h) => (
          <li key={h.habit_id}>
            <Link href={`/dashboard/habits/${h.habit_id}`} className="text-[#e87722] hover:underline">
              {h.habit_name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-1">
        <Link href="/dashboard/habits" className="text-[#e87722] hover:underline">Edit habit</Link> to update your 2-minute version or add more design.
      </p>
    </div>
  )
}
