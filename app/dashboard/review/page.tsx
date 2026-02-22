import Link from 'next/link'

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Review
        </h1>
        <p className="text-sm text-gray-500">
          The scorecard is a diagnostic + reset tool. Use it to notice patterns, recalibrate habits, and restart when stuck. It does not replace daily check-ins.
        </p>
      </div>

      <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Ways to use the scorecard</h2>
        <ul className="space-y-3">
          <li>
            <Link
              href="/dashboard/review/weekly"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">Weekly review</span>
              <span className="block text-xs text-gray-500 mt-0.5">Rate this week (= / −), see friction and advice, apply one fix.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/scorecard"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">Map your day</span>
              <span className="block text-xs text-gray-500 mt-0.5">List habits and rate them + / − / = by time of day. Recalibrate when you need a reset.</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/review/reset"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-[#e87722]/30 transition-colors"
            >
              <span className="font-medium text-gray-900">I&rsquo;m stuck — reset</span>
              <span className="block text-xs text-gray-500 mt-0.5">60 seconds: mini-scorecard, pick one habit, shrink it, restart.</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
