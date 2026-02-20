import Link from 'next/link'

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #faf8f5 0%, #f5f0e8 40%, #f0ebe0 100%)',
      }}
    >
      {/* Header: single place for Sign up + Log in, like most apps */}
      <header className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="h-0.5 w-3 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-4 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-6 rounded-full bg-[#e87722]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Stacked</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            See app
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-white bg-[#e87722] hover:bg-[#d96b1e] px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero: on desktop, copy left + product mock right; on mobile, stacked with less top padding so mock is above fold */}
      <section className="px-6 pt-8 pb-12 md:pt-16 md:pb-20 max-w-5xl mx-auto">
        <div className="md:flex md:items-center md:gap-12 md:min-h-[420px]">
          {/* Left: copy + CTA */}
          <div className="md:flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
              The habit app
              <br />
              that works.
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-4 leading-relaxed">
              You know the method — scorecard, identities, stacking, streaks.
              <br />
              You want it in one place. No spreadsheets. No duct-taping tools.
            </p>
            <p className="text-sm font-medium text-gray-700 mb-6">
              Built for the full method — not a generic tracker.
            </p>
            <div className="flex justify-center md:justify-start">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
              >
                Get started free
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">Free to start.</p>
            <p className="text-xs text-gray-400 mt-2">Start your scorecard in under a minute.</p>
          </div>
          {/* Right: product mock — subtle hover so it feels interactive */}
          <div className="mt-8 md:mt-0 md:flex-1 flex justify-center md:justify-end">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-lg border border-gray-200/80 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today</span>
                <span className="ml-2 text-xs text-gray-400">3/3 done</span>
              </div>
              <ul className="divide-y divide-gray-100 p-4">
                {[
                  { name: 'Morning journal', streak: 12, done: true },
                  { name: '10 min walk', streak: 7, done: true },
                  { name: 'Read 10 pages', streak: 21, done: true },
                ].map(({ name, streak, done }) => (
                  <li key={name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-gray-800">{name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{streak} day streak</span>
                      {done && (
                        <span className="w-5 h-5 rounded-full bg-[#e87722]/20 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-[#e87722]" />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Scorecard</span>
                <span className="text-xs font-medium text-[#e87722]">+2 −1 =1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story: trimmed so page doesn't feel long */}
      <section className="px-6 py-10 md:py-14 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Sound familiar?</h2>
        <p className="text-gray-600 leading-relaxed">
          You're juggling notes, reminders, and a generic habit tracker that doesn't get the methodology. <strong className="text-gray-800">Stacked</strong> is built for the full system — scorecard, identities, stacking, streaks — so you can focus on the work.
        </p>
      </section>

      {/* What Stacked does */}
      <section className="px-6 py-12 md:py-16 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">What you get</h2>
        <ul className="space-y-4 text-gray-600">
          <li className="flex gap-3">
            <span className="text-[#e87722] font-bold shrink-0">Scorecard</span>
            <span>List your day, rate each habit + / − / =. See the full picture before you change it.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#e87722] font-bold shrink-0">Identities</span>
            <span>“I am a person who…” — tie habits to who you want to become. Every completion is a vote.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#e87722] font-bold shrink-0">Stacking &amp; intentions</span>
            <span>After [current habit], I will [new habit]. At [time] in [place]. No vague goals.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#e87722] font-bold shrink-0">Streaks that don’t punish</span>
            <span>Never miss twice. One off day doesn’t reset you. We’ll nudge you back, not guilt you.</span>
          </li>
        </ul>
      </section>

      {/* Footer: branding only, no duplicate CTAs */}
      <footer className="px-6 py-8 border-t border-gray-200/80 max-w-3xl mx-auto text-center text-sm text-gray-500">
        Stacked — Build habits that compound.
      </footer>
    </div>
  )
}
