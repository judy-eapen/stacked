import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AddToHomeBanner } from '@/components/add-to-home-banner'
import { UserBlock } from '@/components/user-block'
import { RedirectToOnboardingWhenEmpty } from '@/components/redirect-to-onboarding'
import { GuidedTourWrapper } from '@/components/guided-tour-wrapper'
import { DashboardNav } from '@/components/dashboard-nav'

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
    .select('display_name, tour_completed_at')
    .eq('id', user.id)
    .single()
  const displayName = (profile?.display_name ?? '').trim()
  const email = user.email ?? ''
  const tourCompletedAt = profile?.tour_completed_at ?? null
  const { count: identitiesCount } = await supabase
    .from('identities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const hasIdentities = (identitiesCount ?? 0) > 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
      }}
    >
      {/* Top bar: logo, tabs, user */}
      <header className="flex items-center justify-between gap-4 h-14 px-4 md:px-6 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="h-0.5 w-3 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-4 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-6 rounded-full bg-[#e87722]" />
          </div>
          <span className="font-bold tracking-tight text-gray-900">Stacked</span>
        </Link>
        <div className="flex-1 flex justify-center min-w-0 overflow-x-auto">
          <DashboardNav />
        </div>
        <div className="shrink-0">
          <UserBlock displayName={displayName} email={email} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <RedirectToOnboardingWhenEmpty tourCompletedAt={tourCompletedAt} />
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">{children}</div>
      </main>

      <Suspense fallback={null}>
        <GuidedTourWrapper
          tourCompletedAt={tourCompletedAt}
          hasIdentities={hasIdentities}
        />
      </Suspense>

      <AddToHomeBanner />
    </div>
  )
}
