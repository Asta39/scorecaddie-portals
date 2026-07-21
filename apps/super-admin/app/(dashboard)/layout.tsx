import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Score Caddie Super Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Platform brand color drives the whole accent scale (see globals.css).
  let brandColor: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'platform_brand_color')
      .single()
    brandColor = data?.value ?? null
  } catch {
    // Fall back to the default brand color baked into globals.css
  }

  return (
    <div
      className="contents"
      style={brandColor ? ({ '--color-brand': brandColor } as React.CSSProperties) : undefined}
    >
      <AppShell>
        {children}
      </AppShell>
    </div>
  )
}
