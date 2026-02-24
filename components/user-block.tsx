'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function UserBlock({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-w-0 md:min-w-[200px] max-w-full rounded-lg border border-transparent hover:border-gray-200/80 focus-within:border-gray-200/80 px-2 md:px-3 py-2 text-right">
      <Link
        href="/dashboard/settings"
        className="block text-sm text-gray-600 hover:text-gray-900 py-0.5"
      >
        <p className="font-medium text-gray-900 truncate" title={displayName || 'Account'}>{displayName || 'Account'}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5" title={email}>{email}</p>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="block w-full text-right mt-1 py-0.5 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        Log out
      </button>
    </div>
  )
}
