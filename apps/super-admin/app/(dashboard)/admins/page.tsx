import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { UserCheck } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminsPage() {
  const supabase = await createClient()

  const { data: admins } = await supabase
    .from('club_admins')
    .select('*, clubs(name, location)')
    .order('created_at', { ascending: false })

  return (
    <div className="portal-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Club Admins</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            All secretary accounts across {new Set(admins?.map((a: any) => a.club_id)).size} clubs
          </p>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Secretary</th>
              <th>Club</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(!admins || admins.length === 0) ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                      <UserCheck size={22} style={{ color: 'var(--color-secondary)' }} />
                    </div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>No secretary accounts yet</p>
                    <p className="text-sm" style={{ color: 'var(--color-light)' }}>Create a club first, then add a secretary from the club detail page</p>
                  </div>
                </td>
              </tr>
            ) : admins.map((a: any) => (
              <tr key={a.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--color-lighter)' }}>
                      <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                        {(a.name ?? a.email ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-sm">{a.name ?? '—'}</span>
                  </div>
                </td>
                <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {(a as any).clubs?.name ?? '—'}
                </td>
                <td className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>{a.email}</td>
                <td>
                  <span className={`badge badge-${a.is_active ? 'active' : 'suspended'}`}>
                    {a.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {format(new Date(a.created_at), 'd MMM yyyy')}
                </td>
                <td>
                  {a.club_id && (
                    <Link href={`/clubs/${a.club_id}`}
                      className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      View club →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
