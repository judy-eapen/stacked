'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RedirectToOnboardingWhenEmpty() {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (pathname === '/dashboard/onboarding') {
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
        router.replace('/dashboard/onboarding')
        return
      }
      setChecked(true)
    }
    run()
  }, [pathname, router])

  return null
}
