'use client'

import { useState } from 'react'

export const TOUR_STEPS: { title: string; body: string }[] = [
  {
    title: 'Today',
    body: 'Check in here daily. Tap each habit when you do it. Every completion is a vote for your identity. Never miss twice: one miss is okay; come back tomorrow.',
  },
  {
    title: 'Identities',
    body: 'Who do you want to become? Identities are your north star. Add habits that reinforce them and see your votes here.',
  },
  {
    title: 'Habits',
    body: 'Add and design habits here. Use the 4 laws to make habits obvious, attractive, easy, and satisfying. You can stack habits and set a two-minute version.',
  },
  {
    title: 'Review',
    body: 'Reflect weekly and monthly. See what worked, what didn\'t, and adjust. Use the scorecard when you need to reset or recalibrate.',
  },
  {
    title: 'Partners',
    body: 'Invite someone to be your accountability partner. They can see your shared habits and cheer you on. You can also create a habit contract.',
  },
  {
    title: 'Settings',
    body: 'Set your display name, email and push reminders, Google Calendar sync, and export your data.',
  },
  {
    title: "You're all set",
    body: 'Open Today to check in and build habits that compound.',
  },
]

export function GuidedTour({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  onSkip: () => void
}) {
  const [step, setStep] = useState(0)
  const total = TOUR_STEPS.length
  const isLast = step === total - 1
  const current = TOUR_STEPS[step]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-500">
            Step {step + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Skip tour
          </button>
        </div>
        <h2 id="tour-title" className="text-lg font-semibold text-gray-900">
          {current.title}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
            ) : (
              <span />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLast ? (
              <button
                type="button"
                onClick={onComplete}
                className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
