import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stacked — Build habits that compound',
  description: 'Auth demo with ghosted product preview',
  manifest: '/manifest.json',
  themeColor: '#e87722',
  appleWebApp: { capable: true, title: 'Stacked' },
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
