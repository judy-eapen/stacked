'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'stacked-add-to-home-dismissed'

export function AddToHomeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) return
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isMobile && !isStandalone) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-3 mb-3 rounded-xl bg-white border border-gray-200 shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Add to home screen</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tap your browser menu (⋮) then &ldquo;Add to Home Screen&rdquo; for quick access.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-[#e87722] hover:underline focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 rounded px-1 py-0.5"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-gray-500 hover:text-gray-700 p-1 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 rounded"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
