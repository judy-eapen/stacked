'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GuidedTour } from '@/components/guided-tour'

export function GuidedTourWrapper({
  tourCompletedAt,
  hasIdentities,
}: {
  tourCompletedAt: string | null
  hasIdentities: boolean
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const replay = searchParams.get('tour') === '1'
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (replay) {
      setShow(true)
      return
    }
    if (!tourCompletedAt) {
      setShow(true)
    }
  }, [replay, tourCompletedAt])

  const handleComplete = async () => {
    if (replay) {
      router.replace('/dashboard', { scroll: false })
      setShow(false)
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_completed_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    setShow(false)
    if (!hasIdentities) {
      router.replace('/dashboard/onboarding')
    }
  }

  const handleSkip = async () => {
    if (replay) {
      router.replace('/dashboard', { scroll: false })
      setShow(false)
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_completed_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    setShow(false)
    if (!hasIdentities) {
      router.replace('/dashboard/onboarding')
    }
  }

  if (!show) return null

  return (
    <GuidedTour
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  )
}
