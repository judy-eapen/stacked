'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { dashboardNavItems } from '@/components/dashboard-nav'
import { LogOutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function DashboardHeader({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-4 h-14 px-3 md:px-6 lg:px-8 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shrink-0">
        {/* Left: logo, name/email (desktop only) */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="h-0.5 w-3 rounded-full bg-[#e87722]" />
              <span className="h-0.5 w-4 rounded-full bg-[#e87722]" />
              <span className="h-0.5 w-6 rounded-full bg-[#e87722]" />
            </div>
            <span className="font-bold tracking-tight text-gray-900">Stacked</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="hidden md:block min-w-0 border-l border-gray-200/80 pl-3 lg:pl-4"
            onClick={closeMobileMenu}
          >
            <p className="font-medium text-gray-900 truncate text-sm" title={displayName || 'Account'}>{displayName || 'Account'}</p>
            <p className="text-xs text-gray-500 truncate" title={email}>{email}</p>
          </Link>
        </div>

        {/* Center: nav (desktop only) */}
        <div className="hidden md:flex justify-center min-w-0">
          <nav className="flex items-center gap-1" aria-label="Main">
            {dashboardNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-[#e87722] text-white' : 'text-gray-700 hover:bg-[#e87722]/10 hover:text-gray-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: mobile menu button (mobile) or log out (desktop) */}
        <div className="flex items-center justify-end gap-1 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <LogOutButton />
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          aria-hidden="true"
        >
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
          />
          <div className="absolute right-0 top-0 bottom-0 w-[min(280px,85vw)] bg-white border-l border-gray-200 shadow-xl flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200/80">
              <span className="font-semibold text-gray-900">Menu</span>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col p-2" aria-label="Main">
              {dashboardNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                      isActive ? 'bg-[#e87722] text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-gray-200/80 p-3 mt-auto space-y-1">
              <Link
                href="/dashboard/settings"
                onClick={closeMobileMenu}
                className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <p className="font-medium text-gray-900">{displayName || 'Account'}</p>
                <p className="text-xs text-gray-500 truncate">{email}</p>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
