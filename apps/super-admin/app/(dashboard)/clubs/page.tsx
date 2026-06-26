import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { Plus, MapPin } from 'lucide-react'
import AddClubButton from '@/components/clubs/AddClubButton'
import Link from 'next/link'
import { DeleteClubButton } from '@/components/clubs/DeleteClubButton'
export const dynamic = 'force-dynamic'

export default async function ClubsPage() {
  const supabase = await createClient()

  const { data: clubs } = await supabase
    .from('clubs')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: courses } = await supabase
    .from('Course')
    .select('id, name')
    .order('name')

  // Get caddie counts per club
  const { data: caddieCounts } = await supabase
    .from('caddies')
    .select('club_id')
    .eq('is_active', true)

  const countByClub = (caddieCounts ?? []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.club_id] = (acc[c.club_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="portal-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clubs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clubs?.length ?? 0} golf club{(clubs?.length ?? 0) !== 1 ? 's' : ''} on the platform
          </p>
        </div>
        <AddClubButton courses={courses ?? []} />
      </div>

      <div className="card">
        <div className="table-responsive-wrapper">
          <table className="data-table">
          <thead>
            <tr>
              <th>Club Name</th>
              <th>Location</th>
              <th>Caddies</th>
              <th>Status</th>
              <th>Onboarded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!clubs || clubs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
                      <MapPin size={22} className="text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">No clubs yet</p>
                    <p className="text-sm text-muted-foreground">Add your first golf club to get started</p>
                  </div>
                </td>
              </tr>
            ) : clubs.map((club: any) => (
              <tr key={club.id}>
                <td>
                  <div className="flex items-center gap-3">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name}
                        className="w-8 h-8 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                        <span className="text-xs font-bold text-primary">
                          {club.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="font-semibold text-sm">{club.name}</span>
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">
                  {club.location ?? '—'}{club.region ? `, ${club.region}` : ''}
                </td>
                <td>
                  <span className="font-semibold">{countByClub[club.id] ?? 0}</span>
                  <span className="text-xs ml-1 text-muted-foreground">caddies</span>
                </td>
                <td>
                  <span className={`badge badge-${club.status === 'active' ? 'active' : 'suspended'}`}>
                    {club.status}
                  </span>
                </td>
                <td className="text-sm text-muted-foreground">
                  {format(new Date(club.onboarded_at), 'd MMM yyyy')}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/clubs/${club.id}`}
                      className="text-sm font-semibold text-primary hover:underline">
                      View →
                    </Link>
                    <DeleteClubButton clubId={club.id} clubName={club.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
