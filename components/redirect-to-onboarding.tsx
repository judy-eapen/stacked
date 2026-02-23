'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Redirect to onboarding only when user has no identities AND has already
 * completed or skipped the feature tour. New users see the tour first, then
 * are sent to onboarding (identity → habit → 2-min → first completion).
 */
export function RedirectToOnboardingWhenEmpty({
  tourCompletedAt,
}: {
  tourCompletedAt: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (pathname === '/dashboard/onboarding') {
      if (!tourCompletedAt) {
        router.replace('/dashboard')
        return
      }
      setChecked(true)
      return
    }
    const run = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChecked(true)
        return
      }
      const { data, error } = await supabase
        .from('identities')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
      if (!error && (!data || data.length === 0)) {
        if (tourCompletedAt) {
          router.replace('/dashboard/onboarding')
          return
        }
      }
      setChecked(true)
    }
    run()
  }, [pathname, router, tourCompletedAt])

  return null
}
