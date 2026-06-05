import type { Metadata } from 'next'
import Sidebar from '@/components/layout/Sidebar'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Score Caddie Super Admin' }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <Sidebar />
      <main className="portal-main">
        {children}
      </main>
    </div>
  )
}
