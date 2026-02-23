import type { Metadata, Viewport } from 'next'
import { Outfit, Inter } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Stacked — Build habits that compound',
  description: 'The habit app that works. Scorecard, identities, stacking, streaks — one place. Built for the Atomic Habits method.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Stacked' },
}

export const viewport: Viewport = {
  themeColor: 'oklch(0.65 0.19 50)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="antialiased font-body">{children}</body>
    </html>
  )
}
