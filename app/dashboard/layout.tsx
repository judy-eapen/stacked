import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddToHomeBanner } from '@/components/add-to-home-banner'
import { UserBlock } from '@/components/user-block'

const nav = [
  { label: 'Scorecard', href: '/dashboard/scorecard', badge: 'Next step' },
  { label: 'Identities', href: '/dashboard/identities' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const displayName = (profile?.display_name ?? '').trim()
  const email = user.email ?? ''

  // First-run: if display name not set, send to display-name page (they can skip)
  if (!displayName) {
    redirect('/display-name')
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
      }}
    >
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200/80 bg-white/70 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-2 px-5 border-b border-gray-200/80">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="h-0.5 w-3 rounded-full bg-[#e87722]" />
              <span className="h-0.5 w-4 rounded-full bg-[#e87722]" />
              <span className="h-0.5 w-6 rounded-full bg-[#e87722]" />
            </div>
            <span className="font-bold tracking-tight text-gray-900">Stacked</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#e87722]/10 hover:text-gray-900"
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#e87722] bg-[#e87722]/10 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200/80">
          <UserBlock displayName={displayName} email={email} />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="h-0.5 w-3 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-4 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-6 rounded-full bg-[#e87722]" />
          </div>
          <span className="font-bold tracking-tight text-gray-900">Stacked</span>
        </Link>
        <nav className="flex gap-2">
          <Link
            href="/dashboard/scorecard"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Scorecard
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#e87722] bg-[#e87722]/10 px-1.5 py-0.5 rounded">
              Next step
            </span>
          </Link>
          <Link
            href="/dashboard/identities"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Identities
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 md:pl-60 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">{children}</div>
      </main>

      <AddToHomeBanner />
    </div>
  )
}
