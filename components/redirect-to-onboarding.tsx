'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Redirect to onboarding only when user has no identities AND no habits AND
 * has already completed or skipped the feature tour. If they have habits
 * (e.g. after deleting their only identity, habits become unlinked), they
 * stay on the dashboard and can use Habits; no forced onboarding.
 */
export function RedirectToOnboardingWhenEmpty({
  tourCompletedAt,
  hasIdentities,
  hasHabits,
}: {
  tourCompletedAt: string | null
  hasIdentities: boolean
  hasHabits: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname === '/dashboard/onboarding') return
    if (!hasIdentities && !hasHabits && tourCompletedAt) {
      router.replace('/dashboard/onboarding')
    }
  }, [pathname, router, tourCompletedAt, hasIdentities, hasHabits])

  return null
}
