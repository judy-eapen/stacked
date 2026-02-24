'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogOutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="shrink-0 text-sm font-medium text-gray-500 hover:text-gray-700 font-body py-2 px-2 md:px-3"
    >
      Log out
    </button>
  )
}
