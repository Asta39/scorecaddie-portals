import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Score Caddie Club Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The club's brand color drives the whole accent scale (see globals.css).
  let brandColor: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: admin } = await supabase
        .from('club_admins')
        .select('clubs(brand_color)')
        .eq('user_id', user.id)
        .single()
      const club = Array.isArray(admin?.clubs) ? admin?.clubs[0] : admin?.clubs
      brandColor = club?.brand_color ?? null
    }
  } catch {
    // Fall back to the default brand color baked into globals.css
  }

  return (
    <div
      className="contents"
      style={brandColor ? ({ '--color-brand': brandColor } as React.CSSProperties) : undefined}
    >
      <AppShell>{children}</AppShell>
    </div>
  )
}
