import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { Users, UserCheck, CreditCard, Clock } from 'lucide-react'
import { Dashboard } from '@/components/dashboard'

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

  const stats = [
    {
      label: 'Total Caddies',
      value: data.totalCaddies,
      icon: Users,
      hint: `${data.activeSubs} active subscriptions`,
    },
    {
      label: 'Present Today',
      value: data.presentCaddies,
      icon: UserCheck,
      hint: `${data.absentCaddies} absent / checked out`,
    },
    {
      label: 'Active Subscriptions',
      value: data.activeSubs,
      icon: CreditCard,
      hint: `${data.expiredSubs} expired`,
    },
    {
      label: 'Expiring Soon',
      value: data.expiringCaddies,
      icon: Clock,
      hint: 'Within the next 7 days',
    },
  ]

  const presenceData = [
    { name: 'Present', value: data.presentCaddies },
    { name: 'Absent', value: data.absentCaddies },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Overview of your club operations
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>
      <Dashboard
        stats={stats}
        presenceData={presenceData}
        experienceData={data.experienceData}
        checkedInCaddies={data.presentList}
        clubId={data.clubId}
        expiringCaddiesCount={data.expiringCaddies}
      />
    </div>
  )
}
