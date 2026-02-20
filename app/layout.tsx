import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stacked — Build habits that compound',
  description: 'The habit app that works. Scorecard, identities, stacking, streaks — one place. Built for the Atomic Habits method.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Stacked' },
}

export const viewport: Viewport = {
  themeColor: '#e87722',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
