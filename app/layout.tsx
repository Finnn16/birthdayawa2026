import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MoodTrack',
  description: 'Track your daily vibe',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
