import Link from 'next/link'
import { ArrowRight, Target, Layers, Zap, ClipboardList } from 'lucide-react'

const CORE_CONCEPTS = [
  {
    title: 'Identity System',
    description: 'Define who you want to become and attach habits to that identity. Your habits become evidence, not chores.',
    icon: Target,
    iconBg: 'bg-[#e87722]',
  },
  {
    title: 'Habit Stacking',
    description: 'Anchor new behaviors to routines you already have. After I pour coffee, I journal for two minutes.',
    icon: Layers,
    iconBg: 'bg-emerald-500',
  },
  {
    title: 'Meaningful Streaks',
    description: 'Track consistency without punishing imperfection. One miss is an accident. Two is the start of a new pattern.',
    icon: Zap,
    iconBg: 'bg-amber-500',
  },
  {
    title: 'Daily Scorecard',
    description: 'See whether your day strengthened or weakened your chosen identity. Progress, not perfection.',
    icon: ClipboardList,
    iconBg: 'bg-gray-700',
  },
] as const

const STEPS = [
  {
    title: 'Choose an identity',
    description: 'Decide who you want to become. Not what you want to achieve, but the type of person you wish to be.',
  },
  {
    title: 'Attach small daily habits',
    description: 'Link two-minute actions to your identity. Each completion is a vote for the new you.',
  },
  {
    title: 'Show up consistently',
    description: 'Review your week, celebrate wins, adjust what isn\'t working. The system does the rest.',
  },
] as const

const MOCK_HABITS = [
  { name: 'Strength training', value: 12, done: true },
  { name: 'Walk 30 min', value: 8, done: true },
  { name: 'Stretch for 10 min', value: 5, done: false },
  { name: 'Take the stairs', value: 3, done: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-[#faf8f5]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
            Stacked
          </Link>
          <nav className="flex items-center gap-6">
            <a href="#philosophy" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Philosophy
            </a>
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              How It Works
            </a>
            <a href="#beta" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Beta
            </a>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-[#e87722] hover:bg-[#d96b1e] px-4 py-2 rounded-lg transition-colors"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-12 pb-20 md:pt-20 md:pb-28 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#e87722]/15 text-[#e87722] mb-4">
                Private Beta
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                Become the type of person who keeps promises to themselves.
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Stacked is a private beta habit system built around identity, small actions, and daily consistency.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors shadow-sm"
                >
                  Request Early Access
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  See How It Works
                </a>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-lg border border-gray-200/80 p-5 bg-gradient-to-br from-orange-50/80 to-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Identity</p>
                <p className="text-gray-900 font-medium mb-4">I am a person who moves every day.</p>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-5">
                  <div className="h-full rounded-full bg-[#e87722] w-3/4" />
                </div>
                <ul className="space-y-3 mb-4">
                  {MOCK_HABITS.map((h) => (
                    <li key={h.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${h.done ? 'bg-[#e87722]' : 'bg-gray-300'}`} />
                        {h.name}
                      </span>
                      <span className="font-medium text-gray-700">{h.value}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                  Daily scorecard — 2/4 completed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section id="philosophy" className="px-6 py-16 md:py-24 bg-white/50 border-y border-gray-200/60">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
              Habits are not tasks. They are votes for who you are becoming.
            </h2>
            <p className="text-lg text-gray-600">
              Most habit trackers measure completion. Stacked measures identity reinforcement. Every habit you complete is a vote for the type of person you want to be.
            </p>
          </div>
        </section>

        {/* Core Concepts */}
        <section id="features" className="px-6 py-16 md:py-24 max-w-6xl mx-auto">
          <p className="text-sm font-semibold text-[#e87722] uppercase tracking-wider text-center mb-2">
            Core Concepts
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Built on proven principles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_CONCEPTS.map(({ title, description, icon: Icon, iconBg }) => (
              <div
                key={title}
                className="rounded-2xl bg-white border border-gray-200/80 p-5 shadow-sm hover:shadow-md hover:border-[#e87722]/20 transition-all"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} text-white mb-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 py-16 md:py-24 bg-white/50 border-y border-gray-200/60">
          <div className="max-w-6xl mx-auto">
            <p className="text-sm font-semibold text-[#e87722] uppercase tracking-wider text-center mb-2">
              How It Works
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 text-center mb-14">
              Three steps to identity change
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {STEPS.map(({ title, description }, i) => (
                <div key={title} className="flex flex-col items-center text-center md:items-start md:text-left">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e87722] text-white font-bold text-lg mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 max-w-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Early Access */}
        <section id="beta" className="px-6 py-16 md:py-24 bg-[#f5f0e8] border-t border-gray-200/60">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-sm font-semibold text-[#e87722] uppercase tracking-wider mb-2">
              Early Access
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
              Built with a small group
            </h2>
            <p className="text-gray-600 mb-8">
              Stacked is currently invite-only and free for early users. We&apos;re refining the system with a small community before a wider release.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
              >
                Join the Beta
              </Link>
            </div>
            <p className="text-xs text-gray-500">No spam. We respect your inbox.</p>
          </div>
        </section>
      </main>

      <footer className="px-6 py-6 border-t border-gray-200/80 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-gray-900">Stacked</span>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900">About</a>
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
