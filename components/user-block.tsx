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
    <div className="min-w-0 max-w-[200px] rounded-lg border border-transparent hover:border-gray-200/80 focus-within:border-gray-200/80 px-3 py-2">
      <Link
        href="/dashboard/settings"
        className="block text-sm text-gray-600 hover:text-gray-900 py-0.5"
      >
        <p className="font-medium text-gray-900 truncate">{displayName || 'Account'}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{email}</p>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="block w-full text-left mt-1 py-0.5 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        Log out
      </button>
    </div>
  )
}
