import Link from 'next/link'

export default function SplitSignUpPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left: Auth form */}
      <div
        className="flex-1 flex items-center justify-center p-6 md:p-10"
        style={{
          background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f0ebe0 100%)',
        }}
      >
        <div className="w-full max-w-[400px]">
          <Link href="/signup" className="text-xs text-gray-500 hover:text-gray-700 mb-4 inline-block">
            ← Centered signup
          </Link>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-700 mb-4 ml-4 inline-block">
            Home
          </Link>
          <div className="rounded-[20px] bg-white shadow-xl border border-black/6 p-8">
            <div className="flex gap-1.5 mb-2">
              <span className="h-1 w-3 rounded-full bg-[#e87722]" />
              <span className="h-1 w-4 rounded-full bg-[#e87722]" />
              <span className="h-1 w-6 rounded-full bg-[#e87722]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 m-0">Stacked</h1>
            <p className="text-sm text-gray-500 m-0 mb-6">Build habits that compound</p>

            <form className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 focus:border-[#e87722]"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 focus:border-[#e87722]"
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
              >
                Create account
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-3">No credit card required • Takes 30 seconds</p>
            <div className="flex items-center gap-3 my-4">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              className="w-full h-11 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Continue with Google
            </button>
            <p className="text-sm text-gray-500 text-center mt-5">
              Already have an account?{' '}
              <a href="#" className="text-gray-900 underline font-medium">Log in</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Branded panel + product preview (clear, not ghosted) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#e87722] text-white p-8 lg:p-12">
        <div className="max-w-sm w-full">
          {/* Logo lockup */}
          <div className="flex gap-2 items-center mb-2">
            <div className="flex flex-col gap-1">
              <span className="h-1 w-4 rounded-full bg-white/90" />
              <span className="h-1 w-6 rounded-full bg-white/90" />
              <span className="h-1 w-8 rounded-full bg-white/90" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Stacked</span>
          </div>
          <p className="text-white/90 text-sm mb-8">Build habits that compound</p>

          {/* Product preview — clear dashboard mock */}
          <div className="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-5">
            <h3 className="text-sm font-semibold text-white m-0 mb-3">Today</h3>
            <ul className="list-none p-0 m-0 mb-4 space-y-2">
              {['Morning journal', '10 min walk', 'Read 10 pages'].map((habit) => (
                <li key={habit} className="text-sm text-white/95 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {habit}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/80 m-0 mb-3">14 day streak</p>
            <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white" style={{ transform: 'rotate(-90deg)' }} />
            <p className="text-xs text-white/70 mt-4 m-0">Consistency compounds.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
