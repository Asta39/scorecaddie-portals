import type { Metadata } from 'next'
import './globals.css'
import { InstallPrompt } from '@/components/layout/InstallPrompt'

export const metadata: Metadata = {
  title: 'Score Caddie — Club Admin',
  description: 'Club administration portal for Score Caddie',
  manifest: '/manifest.json',
}

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <InstallPrompt />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
