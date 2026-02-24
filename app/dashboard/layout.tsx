import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AddToHomeBanner } from '@/components/add-to-home-banner'
import { DashboardHeader } from '@/components/dashboard-header'
import { RedirectToOnboardingWhenEmpty } from '@/components/redirect-to-onboarding'
import { GuidedTourWrapper } from '@/components/guided-tour-wrapper'

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
  const [{ count: identitiesCount }, { count: habitsCount }] = await Promise.all([
    supabase.from('identities').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('archived_at', null),
  ])
  const hasIdentities = (identitiesCount ?? 0) > 0
  const hasHabits = (habitsCount ?? 0) > 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
      }}
    >
      <DashboardHeader displayName={displayName} email={email} />

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <RedirectToOnboardingWhenEmpty tourCompletedAt={tourCompletedAt} hasIdentities={hasIdentities} hasHabits={hasHabits} />
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
