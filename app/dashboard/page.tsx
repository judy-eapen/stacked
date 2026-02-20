import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-2rem)]">
      <div className="w-full max-w-lg rounded-[20px] bg-white shadow-xl border border-black/6 p-8">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-[#e87722]/10 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-[#e87722]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-2">
              Start with your Scorecard
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              Understand where you are before you change anything.
              <br />
              List your habits. Rate them + / − / =.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-1">
            <Link
              href="/dashboard/scorecard"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors gap-2"
            >
              Go to Scorecard
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/dashboard/identities"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Learn about Identities
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
