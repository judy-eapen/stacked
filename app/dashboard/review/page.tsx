import { ReviewHubClient } from './review-hub-client'

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

      <ReviewHubClient />
    </div>
  )
}
