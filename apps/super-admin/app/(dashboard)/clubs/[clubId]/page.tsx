import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import AddSecretaryButton from '@/components/clubs/AddSecretaryButton'
import EditClubButton from '@/components/clubs/EditClubButton'
import SecretaryList from '@/components/clubs/SecretaryList'
import { ArrowLeft, Users, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ClubDetailPage({ params }: { params: { clubId: string } }) {
  const supabase = await createClient()
  const { clubId } = await params

  const [{ data: club }, { data: caddies }, { data: admins }, { data: payments }] = await Promise.all([
    supabase.from('clubs').select('*').eq('id', clubId).single(),
    supabase.from('caddies').select('*').eq('club_id', clubId).order('name'),
    supabase.from('club_admins').select('*').eq('club_id', clubId),
    supabase.from('caddie_payments').select('*').eq('club_id', clubId).order('created_at', { ascending: false }).limit(10),
  ])

  if (!club) return notFound()

  const activeCount = caddies?.filter((c: any) => c.is_active && c.paid_until && new Date(c.paid_until) > new Date()).length ?? 0
  const expiredCount = (caddies?.length ?? 0) - activeCount

  return (
    <div className="portal-content">
      {/* Back link */}
      <Link href="/clubs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={15} /> Back to Clubs
      </Link>

      {/* Club header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-muted">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{club.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {club.location ?? ''}{club.region ? ` · ${club.region}` : ''} · Onboarded {format(new Date(club.onboarded_at), 'd MMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge badge-${club.status === 'active' ? 'active' : 'suspended'} text-sm`}>
            {club.status}
          </span>
          <EditClubButton club={club} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Caddies', value: caddies?.length ?? 0 },
          { label: 'Active Subscriptions', value: activeCount },
          { label: 'Expired', value: expiredCount },
          { label: 'Secretary Accounts', value: admins?.length ?? 0 },
        ].map(s => (
          <div key={s.label} className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Caddies table */}
        <div className="col-span-2 card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Caddies</h3>
            </div>
          </div>
          <div className="table-responsive-wrapper">
            <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Experience</th>
                <th>Paid Until</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
               {(!caddies || caddies.length === 0) ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No caddies registered</td></tr>
              ) : caddies.map((c: any) => {
                const active = c.paid_until && new Date(c.paid_until) > new Date()
                return (
                   <tr key={c.id}>
                    <td className="font-medium text-sm text-foreground">{c.name}</td>
                    <td className="text-sm text-muted-foreground">{c.phone}</td>
                    <td><span className="capitalize text-sm text-foreground">{c.experience_level}</span></td>
                    <td className={active ? "text-sm text-emerald-600 dark:text-emerald-400 font-medium" : "text-sm text-red-600 dark:text-red-400 font-medium"}>
                      {c.paid_until ? format(new Date(c.paid_until), 'd MMM yyyy') : 'Unpaid'}
                    </td>
                    <td>
                      <span className={`badge badge-${active ? 'active' : 'suspended'}`}>
                        {active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* Admins panel */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <UserCheck size={17} className="text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Secretaries</h3>
              </div>
              <AddSecretaryButton clubId={clubId} clubName={club.name} />
            </div>
            <SecretaryList admins={admins} />
          </div>
        </div>
      </div>
    </div>
  )
}
