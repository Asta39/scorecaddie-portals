import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Score Caddie Super Admin' }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}
