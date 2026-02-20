import Link from 'next/link'

const PILLARS = [
  { label: 'Scorecard', line: 'Rate your day + / − / =', icon: '⊕' },
  { label: 'Identities', line: '"I am a person who…"', icon: '◉' },
  { label: 'Stacking', line: 'After [this], I will [that]', icon: '▸' },
  { label: 'Streaks', line: 'Never miss twice', icon: '◐' },
] as const

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
      }}
    >
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="h-0.5 w-3 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-4 rounded-full bg-[#e87722]" />
            <span className="h-0.5 w-6 rounded-full bg-[#e87722]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Stacked</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            See app
          </Link>
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
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

      <main className="flex-1 px-6 max-w-5xl mx-auto w-full">
        {/* Hero: one idea, one CTA, one mock */}
        <section className="pt-4 pb-16 md:pt-12 md:pb-24">
          <div className="md:flex md:items-center md:gap-12 lg:gap-16">
            <div className="md:flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                The habit app that works.
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md md:max-w-none">
                Scorecard, identities, stacking, streaks. One place. No duct tape.
              </p>
              <div className="flex justify-center md:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors shadow-sm"
                >
                  Get started free
                </Link>
              </div>
            </div>
            <div className="mt-12 md:mt-0 md:flex-1 flex justify-center md:justify-end">
              <div className="w-full max-w-[320px] rounded-2xl bg-white shadow-xl border border-gray-200/80 overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Scorecard</span>
                </div>
                <ul className="divide-y divide-gray-100 p-4">
                  {[
                    { name: 'Morning journal', rating: '+' },
                    { name: 'Check phone first thing', rating: '−' },
                    { name: 'Read 10 pages', rating: '=' },
                  ].map(({ name, rating }) => (
                    <li key={name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-gray-800">{name}</span>
                      <span className="text-sm font-semibold text-gray-600 w-6 text-center">{rating}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Summary</p>
                  <p className="text-xs text-gray-700">
                    <span className="text-green-700 font-medium">1 helpful</span>
                    <span className="mx-1.5 text-gray-300">·</span>
                    <span className="text-red-600 font-medium">1 to cut</span>
                    <span className="mx-1.5 text-gray-300">·</span>
                    <span className="text-gray-600 font-medium">1 neutral</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The method: four pillars, scannable */}
        <section className="py-12 md:py-16 border-t border-gray-200/60">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider text-center mb-8">
            The method in one place
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {PILLARS.map(({ label, line, icon }) => (
              <div
                key={label}
                className="rounded-xl bg-white/80 border border-gray-200/80 p-5 text-center md:text-left hover:border-[#e87722]/30 hover:shadow-md transition-all duration-200"
              >
                <span className="text-2xl text-[#e87722] mb-2 block" aria-hidden>
                  {icon}
                </span>
                <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
                <p className="text-sm text-gray-600">{line}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Single closing line + CTA */}
        <section className="py-12 md:py-16 text-center">
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Built for the full system. Not a generic tracker.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Get started free
          </Link>
        </section>
      </main>

      <footer className="px-6 py-6 border-t border-gray-200/80 text-center text-sm text-gray-500">
        Stacked — Build habits that compound.
      </footer>
    </div>
  )
}
