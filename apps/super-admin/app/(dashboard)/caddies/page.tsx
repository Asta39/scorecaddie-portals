import { createClient } from '@/lib/supabase'
import ClubFilter from '@/components/caddies/ClubFilter'
import CaddiesTable from '@/components/caddies/CaddiesTable'

export const dynamic = 'force-dynamic'

export default async function CaddiesPage({ searchParams }: { searchParams: { club?: string } }) {
  const supabase = await createClient()
  const sp = await searchParams

  let query = supabase
    .from('caddies')
    .select('*, clubs(name)')
    .order('name')

  if (sp.club) query = query.eq('club_id', sp.club)

  const { data: caddies } = await query

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  const now = new Date()
  const active = caddies?.filter((c: any) => c.paid_until && new Date(c.paid_until) > now) ?? []
  const expired = caddies?.filter((c: any) => !c.paid_until || new Date(c.paid_until) <= now) ?? []

  return (
    <div className="portal-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caddies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {caddies?.length ?? 0} total · {active.length} active · {expired.length} expired
          </p>
        </div>

        {/* Club filter */}
        <div className="flex items-center gap-2">
          <ClubFilter clubs={clubs ?? []} currentClubId={sp.club ?? ''} />
        </div>
      </div>

      <CaddiesTable initialCaddies={caddies ?? []} />
    </div>
  )
}
