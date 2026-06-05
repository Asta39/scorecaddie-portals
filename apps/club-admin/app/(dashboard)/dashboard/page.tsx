import { createClient } from '@/lib/supabase'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { Users, UserCheck, CreditCard, Clock, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { PresenceDonut, ExperienceChart } from '@/components/dashboard/DashboardCharts'
import { CheckedInTable } from '@/components/dashboard/CheckedInTable'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: admin } = await supabase
    .from('club_admins')
    .select('club_id, name')
    .eq('user_id', user.id)
    .single()

  if (!admin) throw new Error('Club admin record not found')

  const clubId = admin.club_id

  // ── Core counts ────────────────────────────────────────────────
  const [
    { count: totalCaddies },
    { count: presentCaddies },
    { count: activeSubs },
    { count: expiredSubs },
    { count: expiringCaddies },
  ] = await Promise.all([
    supabase.from('caddies').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_active', true),
    supabase.from('caddie_attendance').select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('date', format(new Date(), 'yyyy-MM-dd'))
      .not('time_in', 'is', null)
      .is('time_out', null)
      .eq('is_absent', false),
    supabase.from('caddies').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_active', true).gt('paid_until', new Date().toISOString()),
    supabase.from('caddies').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_active', true).lt('paid_until', new Date().toISOString()),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('is_active', true)
      .gt('paid_until', new Date().toISOString())
      .lt('paid_until', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // ── Total Revenue and Monthly Revenue logic has been removed to hide financial data ──
  // ── Recent Payments logic has been removed to hide financial data ──

  // ── Experience level distribution ─────────────────────────────
  const { data: caddiesAll } = await supabase
    .from('caddies')
    .select('experience_level')
    .eq('club_id', clubId)
    .eq('is_active', true)

  const levelCounts: Record<string, number> = {}
  ;(caddiesAll ?? []).forEach(c => {
    const lvl = c.experience_level
      ? c.experience_level.charAt(0).toUpperCase() + c.experience_level.slice(1)
      : 'Unknown'
    levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1
  })
  const experienceData = Object.entries(levelCounts).map(([level, count]) => ({ level, count }))

  // ── Present caddies list with attendance ───────────────────────
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { data: activeAttendance } = await supabase
    .from('caddie_attendance')
    .select('time_in, time_out, caddies(id, name, phone, experience_level, paid_until)')
    .eq('club_id', clubId)
    .eq('date', todayStr)
    .not('time_in', 'is', null)
    .is('time_out', null)
    .eq('is_absent', false)
    .limit(5)

  const presentList = (activeAttendance ?? [])
    .filter(a => a.caddies)
    .map(a => {
      const c = a.caddies as any
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        experience_level: c.experience_level,
        paid_until: c.paid_until,
        time_in: a.time_in,
        time_out: a.time_out,
      }
    })
  
  presentList.sort((a, b) => a.name.localeCompare(b.name))

  return {
    totalCaddies: totalCaddies ?? 0,
    presentCaddies: presentCaddies ?? 0,
    absentCaddies: (totalCaddies ?? 0) - (presentCaddies ?? 0),
    activeSubs: activeSubs ?? 0,
    expiredSubs: expiredSubs ?? 0,
    expiringCaddies: expiringCaddies ?? 0,
    experienceData,
    presentList,
    clubId,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const statCards = [
    {
      label: 'Total Caddies',
      value: data.totalCaddies,
      icon: Users,
      color: '#fff',
      bg: 'var(--color-primary)',
      textColor: '#fff',
      sub: `${data.activeSubs} active subscriptions`,
      highlight: true,
    },
    {
      label: 'Present Today',
      value: data.presentCaddies,
      icon: UserCheck,
      color: 'var(--color-secondary)',
      bg: 'var(--color-lighter)',
      textColor: 'var(--color-text)',
      sub: `${data.absentCaddies} absent / checked out`,
      highlight: false,
    },
    {
      label: 'Active Subscriptions',
      value: data.activeSubs,
      icon: CreditCard,
      color: 'var(--color-primary)',
      bg: 'var(--color-lighter)',
      textColor: 'var(--color-text)',
      sub: `${data.expiredSubs} expired`,
      highlight: false,
    },
    {
      label: 'Expiring Soon',
      value: data.expiringCaddies,
      icon: Clock,
      color: '#f59e0b',
      bg: '#fef3c7',
      textColor: 'var(--color-text)',
      sub: 'Within the next 7 days',
      highlight: false,
    },
  ]

  return (
    <div className="portal-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)',
            letterSpacing: '-0.02em',
          }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            {format(new Date(), "EEEE, d MMMM yyyy")} · Overview of your club operations
          </p>
        </div>
        <div style={{
          fontSize: '0.75rem', fontWeight: 600,
          padding: '6px 14px', borderRadius: '8px',
          background: '#ecfdf5', color: '#10b981',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => (
          <div key={card.label} className="card" style={{
            padding: '1.25rem 1.5rem',
            background: card.highlight ? card.bg : '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle gradient overlay for the highlighted card */}
            {card.highlight && (
              <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                background: 'linear-gradient(135deg, transparent 60%, rgba(255,255,255,0.12) 100%)',
                pointerEvents: 'none',
              }} />
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
              <div>
                <p style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: card.highlight ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)',
                  marginBottom: '0.75rem',
                }}>
                  {card.label}
                </p>
                <p style={{
                  fontSize: '1.75rem', fontWeight: 800,
                  color: card.textColor,
                  lineHeight: 1.1,
                }}>
                  {card.value}
                </p>
                <p style={{
                  fontSize: '0.7rem', marginTop: '0.5rem',
                  color: card.highlight ? 'rgba(255,255,255,0.65)' : 'var(--color-text-muted)',
                }}>
                  {card.sub}
                </p>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: card.highlight ? 'rgba(255,255,255,0.2)' : card.bg,
                flexShrink: 0,
              }}>
                <card.icon size={20} color={card.color} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="lg:col-span-1">
          <PresenceDonut data={[
            { name: 'Present', value: data.presentCaddies },
            { name: 'Absent', value: data.absentCaddies },
          ]} />
        </div>
        <div className="lg:col-span-1">
          <ExperienceChart data={data.experienceData} />
        </div>
      </div>

      {/* Quick-Glance: Checked-In Caddies */}
      <CheckedInTable initialCaddies={data.presentList} clubId={data.clubId} />

      {/* Expiring-soon alert banner */}
      {data.expiringCaddies > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem 1.5rem',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Clock size={18} color="#f59e0b" />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>
              {data.expiringCaddies} caddie{data.expiringCaddies > 1 ? 's' : ''} expiring within 7 days
            </p>
            <p style={{ fontSize: '0.75rem', color: '#a16207' }}>
              Head to <Link href="/payments" style={{ fontWeight: 700, textDecoration: 'underline' }}>Payments</Link> to renew their subscriptions before they lose marketplace visibility.
            </p>
          </div>
        </div>
      )}

      {/* Pulse animation style */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
