import type { Metadata } from 'next'
import './globals.css'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Score Caddie — Super Admin',
  description: 'Platform control centre for Score Caddie',
  manifest: '/manifest.json',
}

// Type is set globally in globals.css: the Apple-calm SF-adjacent system stack.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
