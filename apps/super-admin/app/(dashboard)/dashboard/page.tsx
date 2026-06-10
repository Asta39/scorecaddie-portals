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

import { Dashboard } from '@/components/dashboard'

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <Dashboard data={d} />
    </div>
  )
}
