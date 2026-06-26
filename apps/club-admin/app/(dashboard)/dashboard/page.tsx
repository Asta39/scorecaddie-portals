import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { Users, UserCheck, CreditCard, Clock } from 'lucide-react'
import { Dashboard } from '@/components/dashboard'
import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export const dynamic = 'force-dynamic'

async function getDashboardData(clubId: string) {
  const supabase = await createClient()

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
  const { data: experienceMix } = await supabase.rpc('get_caddie_experience_mix', {
    p_club_id: clubId,
  })

  const experienceData = (experienceMix ?? []).map((row: any) => ({
    level: row.level,
    count: Number(row.count)
  }))

  const { data: attendanceHistoryData } = await supabase.rpc('get_attendance_history', {
    p_club_id: clubId,
    p_days: 90
  })
  const attendanceHistory = (attendanceHistoryData ?? []).map((row: any) => ({
    date: row.date,
    count: Number(row.attendance)
  }))

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
    attendanceHistory,
    presentList,
    clubId,
  }
}

async function DashboardContent({ clubId }: { clubId: string }) {
  const data = await getDashboardData(clubId)

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

  const subscriptionData = [
    { category: 'Active', count: data.activeSubs },
    { category: 'Expiring Soon', count: data.expiringCaddies },
    { category: 'Expired', count: data.expiredSubs },
  ]

  return (
    <Dashboard
      stats={stats}
      presenceData={presenceData}
      experienceData={data.experienceData}
      attendanceHistory={data.attendanceHistory}
      subscriptionData={subscriptionData}
      checkedInCaddies={data.presentList}
      clubId={data.clubId}
      expiringCaddiesCount={data.expiringCaddies}
    />
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: admin } = await supabase
    .from('club_admins')
    .select('club_id')
    .eq('user_id', user.id)
    .single()

  if (!admin) throw new Error('Club admin record not found')

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
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent clubId={admin.club_id} />
      </Suspense>
    </div>
  )
}
