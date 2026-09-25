import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'
import { getServerAdmin } from '@/lib/server-admin'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Score Caddie Club Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The club's brand color drives the whole accent scale (see globals.css).
  let brandColor: string | null = null
  try {
    brandColor = (await getServerAdmin())?.brandColor ?? null
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
