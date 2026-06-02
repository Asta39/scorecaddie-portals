import { createClient } from '@/lib/supabase'
import { Building2, Users, CheckCircle, TrendingUp, AlertTriangle, Clock, CreditCard, ArrowUpRight, Shield } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { PlatformRevenueChart, SubscriptionDonut, ClubCaddiesChart } from '@/components/dashboard/SuperAdminCharts'
import RecentFlagsCard from '@/components/dashboard/RecentFlagsCard'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()

  // ── Core counts ────────────────────────────────────────────────
  const [
    { count: totalClubs },
    { count: totalCaddies },
    { count: activeSubscriptions },
    { count: expiredSubscriptions },
    { count: expiringIn7Days },
    { count: unresolvedFlags },
  ] = await Promise.all([
    supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('caddies').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('is_active', true).gt('paid_until', new Date().toISOString()),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('is_active', true).lt('paid_until', new Date().toISOString()),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('paid_until', new Date().toISOString())
      .lt('paid_until', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('platform_flags').select('*', { count: 'exact', head: true }).eq('resolved', false),
  ])

  // ── Pricing & MRR ─────────────────────────────────────────────
  const { data: priceConfig } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', 'caddie_monthly_fee_kes')
    .single()

  const pricePerCaddie = parseInt(priceConfig?.value ?? '280', 10)
  const mrr = (activeSubscriptions ?? 0) * pricePerCaddie

  // ── All payments (for revenue chart) ──────────────────────────
  const { data: allPayments } = await supabase
    .from('caddie_payments')
    .select('amount_kes, paid_at')
    .eq('status', 'confirmed')

  const totalRevenue = (allPayments ?? []).reduce((sum, p) => sum + (p.amount_kes ?? 0), 0)

  // Monthly revenue for last 6 months
  const now = new Date()
  const monthlyRevenue: { month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const label = format(m, 'MMM')
    const mStart = startOfMonth(m).toISOString()
    const mEnd = endOfMonth(m).toISOString()
    const total = (allPayments ?? [])
      .filter(p => p.paid_at >= mStart && p.paid_at <= mEnd)
      .reduce((sum, p) => sum + (p.amount_kes ?? 0), 0)
    monthlyRevenue.push({ month: label, amount: total })
  }

  // ── Per-club breakdown (for bar chart) ────────────────────────
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(10)

  const clubCaddies: { name: string; caddies: number; active: number }[] = []
  for (const club of (clubs ?? [])) {
    const [{ count: total }, { count: activeCt }] = await Promise.all([
      supabase.from('caddies').select('*', { count: 'exact', head: true }).eq('club_id', club.id).eq('is_active', true),
      supabase.from('caddies').select('*', { count: 'exact', head: true })
        .eq('club_id', club.id).eq('is_active', true).gt('paid_until', new Date().toISOString()),
    ])
    clubCaddies.push({
      name: club.name.length > 18 ? club.name.substring(0, 16) + '…' : club.name,
      caddies: total ?? 0,
      active: activeCt ?? 0,
    })
  }

  // ── Recent payments ────────────────────────────────────────────
  const { data: recentPayments } = await supabase
    .from('caddie_payments')
    .select('*, clubs(name)')
    .order('created_at', { ascending: false })
    .limit(6)

  // ── Recent flags ───────────────────────────────────────────────
  const { data: flags } = await supabase
    .from('platform_flags')
    .select('*, clubs(name)')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    totalClubs: totalClubs ?? 0,
    totalCaddies: totalCaddies ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    expiredSubscriptions: expiredSubscriptions ?? 0,
    expiringIn7Days: expiringIn7Days ?? 0,
    unresolvedFlags: unresolvedFlags ?? 0,
    mrr,
    totalRevenue,
    pricePerCaddie,
    monthlyRevenue,
    clubCaddies,
    recentPayments: recentPayments ?? [],
    flags: flags ?? [],
  }
}

export default async function DashboardPage() {
  const d = await getDashboardData()
  const subPercent = d.totalCaddies > 0 ? Math.round((d.activeSubscriptions / d.totalCaddies) * 100) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Platform Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            {format(new Date(), "EEEE, d MMMM yyyy")} · System-wide analytics
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '0.75rem', fontWeight: 600, padding: '6px 14px', borderRadius: '8px',
          background: '#ecfdf5', color: '#10b981',
        }}>
          <Shield size={14} />
          Super Admin
        </div>
      </div>

      {/* ─── Hero Stat Cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {/* MRR — highlighted */}
        <div className="card" style={{
          padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #0B2B26 0%, #163832 100%)',
          position: 'relative', overflow: 'hidden', gridColumn: 'span 1',
        }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
            Monthly Revenue
          </p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
            KES {d.mrr.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.5rem' }}>
            {d.activeSubscriptions} × KES {d.pricePerCaddie}/mo
          </p>
        </div>

        {/* Active Clubs — highlighted */}
        <div className="card" style={{
          padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #0B2B26 0%, #163832 100%)',
          position: 'relative', overflow: 'hidden', gridColumn: 'span 1',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
                Active Clubs
              </p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                {d.totalClubs}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.5rem' }}>
                On the platform
              </p>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)', flexShrink: 0,
            }}>
              <Building2 size={18} color="#8EB69B" strokeWidth={2} />
            </div>
          </div>
        </div>

        {[
          { label: 'Total Caddies', value: d.totalCaddies, icon: Users, color: 'var(--color-secondary)', bg: 'var(--color-lighter)', sub: `${subPercent}% subscription rate` },
          { label: 'Active Subs', value: d.activeSubscriptions, icon: CheckCircle, color: 'var(--color-primary)', bg: 'var(--color-lighter)', sub: `${d.expiredSubscriptions} expired` },
          { label: 'Open Flags', value: d.unresolvedFlags, icon: AlertTriangle,
            color: d.unresolvedFlags > 0 ? '#ef4444' : 'var(--color-secondary)',
            bg: d.unresolvedFlags > 0 ? '#fef2f2' : 'var(--color-lighter)',
            sub: d.unresolvedFlags > 0 ? 'Needs attention' : 'All clear',
          },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '0.75rem' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </p>
                <p style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  {card.sub}
                </p>
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: card.bg, flexShrink: 0,
              }}>
                <card.icon size={18} color={card.color} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Charts Row ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>Revenue Overview</h3>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Platform-wide payment volume (last 6 months)</p>
            </div>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, color: '#10b981',
              background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px',
            }}>
              KES {d.totalRevenue.toLocaleString()} total
            </div>
          </div>
          <PlatformRevenueChart data={d.monthlyRevenue} />
        </div>

        {/* Subscription Donut */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <h3 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>Subscription Health</h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Active vs Expiring vs Expired</p>
          </div>
          <SubscriptionDonut data={[
            { name: 'Active', value: d.activeSubscriptions },
            { name: 'Expiring (7d)', value: d.expiringIn7Days },
            { name: 'Expired', value: d.expiredSubscriptions },
          ]} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              { name: 'Active', color: '#10b981' },
              { name: 'Expiring', color: '#f59e0b' },
              { name: 'Expired', color: '#ef4444' },
            ].map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Second Row: Club Bar Chart + Flags ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Per-Club Bar Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>Caddies by Club</h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Total registered vs active subscriptions per club</p>
          </div>
          <ClubCaddiesChart data={d.clubCaddies} />
        </div>

        {/* Flags */}
        <RecentFlagsCard flags={d.flags} />
      </div>

      {/* ─── Recent Payments Table ──────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem 1rem',
        }}>
          <div>
            <h3 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>Recent Payments</h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Latest subscription transactions across all clubs</p>
          </div>
          <Link href="/payments" style={{
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            View All <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="table-responsive-wrapper">
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Club</th>
                <th>Reference</th>
                <th>Caddies</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
          <tbody>
            {d.recentPayments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <CreditCard size={24} style={{ color: '#d1d5db', margin: '0 auto 8px' }} />
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No payments recorded yet</p>
                </td>
              </tr>
            ) : d.recentPayments.map((p: any) => (
              <tr key={p.id}>
                <td className="font-medium">{p.clubs?.name ?? '—'}</td>
                <td>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '0.7rem',
                    background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px',
                    color: '#374151',
                  }}>
                    {p.paystack_reference?.substring(0, 14)}…
                  </span>
                </td>
                <td><span className="font-semibold">{p.caddie_count}</span></td>
                <td><span className="font-semibold" style={{ color: 'var(--color-primary)' }}>KES {p.amount_kes?.toLocaleString()}</span></td>
                <td>
                  <span className={`badge badge-${p.status === 'confirmed' ? 'active' : p.status === 'failed' ? 'suspended' : 'info'}`}>
                    {p.status}
                  </span>
                </td>
                <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                  {p.paid_at ? format(new Date(p.paid_at), 'd MMM yyyy') : p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* ─── Expiring Alert ─────────────────────────────────────── */}
      {d.expiringIn7Days > 0 && (
        <div style={{
          marginTop: '1rem', padding: '1rem 1.5rem', borderRadius: '12px',
          background: '#fffbeb', border: '1px solid #fde68a',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Clock size={18} color="#f59e0b" />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>
              {d.expiringIn7Days} caddie subscription{d.expiringIn7Days > 1 ? 's' : ''} expiring within 7 days
            </p>
            <p style={{ fontSize: '0.75rem', color: '#a16207' }}>
              Clubs should be notified to renew before marketplace visibility is lost.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
