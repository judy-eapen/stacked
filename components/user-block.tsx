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
    <>
      <Link href="/dashboard/settings" className="rounded-lg px-3 py-2.5 block text-sm text-gray-600 hover:bg-gray-100">
        <p className="font-medium text-gray-900 truncate">{displayName || 'Account'}</p>
        <p className="text-xs text-gray-500 truncate">{email}</p>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-1 w-full text-left rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        Log out
      </button>
    </>
  )
}
