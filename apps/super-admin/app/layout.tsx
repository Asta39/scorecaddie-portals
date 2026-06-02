import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { InstallPrompt } from '@/components/layout/InstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Score Caddie — Super Admin',
  description: 'Platform control centre for Score Caddie',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
