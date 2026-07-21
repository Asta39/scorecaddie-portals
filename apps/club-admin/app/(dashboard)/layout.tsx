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

  // Defensive: this value is about to go into a raw <style> tag, so don't
  // trust the DB blindly even though the only write path validates it.
  if (brandColor && !/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    brandColor = null
  }

  return (
    <>
      {brandColor && (
        // A real stylesheet rule targeting :root, not an inline style on a
        // wrapper div. Inline-style inheritance through the component tree
        // is fragile — it silently breaks under any child that portals out
        // of that DOM subtree (which the sidebar primitive here does for
        // some variants). A :root rule always wins regardless of where
        // anything renders.
        <style dangerouslySetInnerHTML={{ __html: `:root { --color-brand: ${brandColor}; }` }} />
      )}
      <AppShell>{children}</AppShell>
    </>
  )
}
