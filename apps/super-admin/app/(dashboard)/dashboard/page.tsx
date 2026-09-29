import { createClient } from '@/lib/supabase'
import { Building2, Users, CheckCircle, TrendingUp, AlertTriangle, Clock, CreditCard, ArrowUpRight, Shield } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { PlatformRevenueChart, SubscriptionDonut, ClubCaddiesChart } from '@/components/dashboard/SuperAdminCharts'
import RecentFlagsCard from '@/components/dashboard/RecentFlagsCard'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()
  const in7DaysIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Everything below is independent, so fire it all at once. This used to
  // run as a chain of sequential awaits plus two count queries per club in a
  // loop, and downloaded every confirmed payment ever made.
  const [
    { count: totalClubs },
    { count: totalCaddies },
    { count: activeSubscriptions },
    { count: expiredSubscriptions },
    { count: expiringIn7Days },
    { count: unresolvedFlags },
    { data: priceConfig },
    { data: summary, error: summaryError },
    { data: recentPayments },
    { data: flags },
    { data: clubRows },
    { data: adminRows },
  ] = await Promise.all([
    supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('caddies').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('is_active', true).gt('paid_until', nowIso),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('is_active', true).lt('paid_until', nowIso),
    supabase.from('caddies').select('*', { count: 'exact', head: true })
      .eq('is_active', true).gt('paid_until', nowIso).lt('paid_until', in7DaysIso),
    supabase.from('platform_flags').select('*', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('platform_config').select('value').eq('key', 'caddie_monthly_fee_kes').single(),
    supabase.rpc('platform_dashboard_summary', { p_club_limit: 10 }),
    supabase.from('caddie_payments').select('*, clubs(name)')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('platform_flags').select('*, clubs(name)')
      .eq('resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('clubs').select('id, name, mascot, course_id').eq('status', 'active'),
    supabase.from('club_admins').select('club_id'),
  ])

  if (summaryError) console.error('platform_dashboard_summary failed:', summaryError.message)

  const pricePerCaddie = parseInt(priceConfig?.value ?? '280', 10)
  const mrr = (activeSubscriptions ?? 0) * pricePerCaddie

  // Confirmed revenue per day; same {created_at, amount_kes} shape the
  // revenue chart already reads.
  const allPayments: { created_at: string; amount_kes: number }[] =
    (summary?.daily ?? []).map((d: { created_at: string; amount_kes: number | string }) => ({
      created_at: d.created_at,
      amount_kes: Number(d.amount_kes),
    }))
  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount_kes, 0)

  const now = new Date()
  const monthlyRevenue: { month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const mStart = startOfMonth(m).getTime()
    const mEnd = endOfMonth(m).getTime()
    const total = allPayments
      .filter(p => {
        const t = new Date(p.created_at).getTime()
        return t >= mStart && t <= mEnd
      })
      .reduce((sum, p) => sum + p.amount_kes, 0)
    monthlyRevenue.push({ month: format(m, 'MMM'), amount: total })
  }

  const clubCaddies: { name: string; caddies: number; active: number }[] =
    (summary?.clubs ?? []).map((c: { name: string; caddies: number; active: number }) => ({
      name: c.name.length > 18 ? c.name.substring(0, 16) + '…' : c.name,
      caddies: Number(c.caddies),
      active: Number(c.active),
    }))

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
    allPayments,
    clubCaddies,
    recentPayments: recentPayments ?? [],
    flags: flags ?? [],
    health: clubHealth(clubRows ?? [], adminRows ?? []),
  }
}

import { Dashboard } from '@/components/dashboard'
import { Mascot } from '@/components/mascot'

type ClubRow = { id: string; name: string; mascot: string | null; course_id: string | null }

/** Which active clubs still can't be used, and why. */
function clubHealth(clubs: ClubRow[], admins: { club_id: string }[]) {
  const withAdmin = new Set(admins.map(a => a.club_id))
  const pending = clubs
    .map(c => ({
      ...c,
      missing: [!c.course_id && 'no linked course', !withAdmin.has(c.id) && 'no secretary'].filter(Boolean) as string[],
    }))
    .filter(c => c.missing.length > 0)
  return { total: clubs.length, pending }
}

function HealthCard({ health }: { health: ReturnType<typeof clubHealth> }) {
  const first = health.pending[0]
  const ready = health.total - health.pending.length
  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <Mascot mascot={first ? first.mascot : 'star'} mood={first ? 'sleep' : 'work'} size={64} hop={!first} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">
          {first ? `${ready} of ${health.total} clubs are good to go.` : `All ${health.total} clubs are good to go.`}
        </p>
        <p className="text-sm text-muted-foreground">
          {first
            ? `${first.name} has ${first.missing.join(' and ')}${health.pending.length > 1 ? `, and ${health.pending.length - 1} more club${health.pending.length > 2 ? 's need' : ' needs'} attention` : ''}.`
            : 'Every club has a linked course and a secretary.'}
        </p>
      </div>
      {first && (
        <Link href={`/clubs/${first.id}`} className="btn-secondary text-sm">Open club</Link>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <div className="flex flex-col gap-6">
      {d.health.total > 0 && <HealthCard health={d.health} />}
      <Dashboard data={d} />
    </div>
  )
}
