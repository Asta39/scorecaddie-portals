'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, Users, ShieldAlert, Award, Zap,
  Building, CheckCircle, RefreshCw, BarChart3, Star, Compass
} from 'lucide-react'

type Club = {
  id: string
  name: string
  location: string | null
  status: string
  created_at: string
}

type ClubAdmin = {
  id: string
  club_id: string
  name: string | null
}

type Caddie = {
  id: string
  club_id: string
  is_active: boolean
  paid_until: string | null
  created_at: string
}

type Payment = {
  id: string
  club_id: string
  amount_kes: number
  caddie_count: number
  status: string
  paid_at: string
}

type DatabaseUser = {
  id: string
  role: string
  createdAt: string
}

type Round = {
  id: string
  userId: string
  courseName: string | null
  totalScore: number | null
  playedAt: string
}

type ClubRow = {
  id: string
  name: string
  location: string
  rosterSize: number
  activeSubs: number
  hasAdmin: boolean
  healthScore: number
  healthLabel: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical'
  checkInCount30d: number
}

export default function PlatformAnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'rounds' | 'clubs'>('overview')

  // Top level platform KPIs
  const [kpis, setKpis] = useState({
    totalUsers: 0,
    playersCount: 0,
    coachesCount: 0,
    caddiesCount: 0,
    active7d: 0,
    active30d: 0,
    totalClubs: 0,
    clubsWithAdmin: 0,
    growthRate: 0,
    totalVolume: 0,
    currentMRR: 0,
    avgBillingPerClub: 0,
    flaggedIssues: 0,
  })

  // Datasets for charts
  const [mrrTrend, setMrrTrend] = useState<any[]>([])
  const [userDistribution, setUserDistribution] = useState<any[]>([])
  const [subStatusData, setSubStatusData] = useState<any[]>([])
  const [roundsTrendData, setRoundsTrendData] = useState<any[]>([])
  const [topCoursesData, setTopCoursesData] = useState<{ name: string; count: number }[]>([])
  const [avgScoresData, setAvgScoresData] = useState<{ name: string; avgScore: number }[]>([])
  const [clubsRanking, setClubsRanking] = useState<ClubRow[]>([])
  const [retentionData, setRetentionData] = useState<any[]>([])

  const loadPlatformAnalytics = async () => {
    setLoading(true)
    try {
      // 1. Fetch raw data from Supabase
      const [
        clubsRes,
        adminsRes,
        caddiesRes,
        paymentsRes,
        usersRes,
        flagsRes,
        attendanceRes,
        roundsRes
      ] = await Promise.all([
        supabase.from('clubs').select('*'),
        supabase.from('club_admins').select('*'),
        supabase.from('caddies').select('*'),
        supabase.from('caddie_payments').select('*').eq('status', 'confirmed'),
        supabase.from('User').select('*'),
        supabase.from('platform_flags').select('*').eq('resolved', false),
        supabase.from('caddie_attendance').select('*'),
        supabase.from('Round').select('*')
      ])

      const clubs: Club[] = clubsRes.data ?? []
      const admins: ClubAdmin[] = adminsRes.data ?? []
      const caddies: Caddie[] = caddiesRes.data ?? []
      const payments: Payment[] = paymentsRes.data ?? []
      const users: DatabaseUser[] = usersRes.data ?? []
      const flags = flagsRes.data ?? []
      const attendance = attendanceRes.data ?? []
      const rounds: Round[] = roundsRes.data ?? []

      const now = new Date()

      // ── PLATFORM OVERVIEW KPIs ──────────────────────────────────────
      const totalClubs = clubs.length
      const clubsWithAdmin = clubs.filter(c => admins.some(a => a.club_id === c.id)).length

      const playersCount = users.filter(u => u.role?.toUpperCase() === 'PLAYER').length
      const coachesCount = users.filter(u => u.role?.toUpperCase() === 'COACH').length
      const caddiesCount = caddies.length
      const totalUsers = playersCount + coachesCount + caddiesCount

      // Active users: players who played a round in the last 7/30 days + caddies checked in
      const activePlayerIds30d = new Set(rounds.filter(r => new Date(r.playedAt) > subDays(now, 30)).map(r => r.userId))
      const activeCaddieIds30d = new Set(attendance.filter(a => a.time_in && new Date(a.date) > subDays(now, 30)).map(a => a.caddie_id))
      const active30d = activePlayerIds30d.size + activeCaddieIds30d.size

      const activePlayerIds7d = new Set(rounds.filter(r => new Date(r.playedAt) > subDays(now, 7)).map(r => r.userId))
      const activeCaddieIds7d = new Set(attendance.filter(a => a.time_in && new Date(a.date) > subDays(now, 7)).map(a => a.caddie_id))
      const active7d = activePlayerIds7d.size + activeCaddieIds7d.size

      // Payments volume
      const totalVolume = payments.reduce((sum, p) => sum + (p.amount_kes ?? 0), 0)
      
      // MRR calculation (caddies paid * 280 KES monthly fee)
      const activePaidCaddies = caddies.filter(c => c.is_active && c.paid_until && new Date(c.paid_until) > now).length
      const currentMRR = activePaidCaddies * 280

      const avgBillingPerClub = totalClubs > 0 ? totalVolume / totalClubs : 0

      // User Growth Rate (MoM)
      const usersLast30d = users.filter(u => new Date(u.createdAt) > subDays(now, 30)).length
      const usersPrev30d = users.filter(u => {
        const d = new Date(u.createdAt)
        return d > subDays(now, 60) && d <= subDays(now, 30)
      }).length
      const growthRate = usersPrev30d > 0
        ? parseFloat((((usersLast30d - usersPrev30d) / usersPrev30d) * 100).toFixed(1))
        : usersLast30d > 0 ? 100.0 : 0.0

      setKpis({
        totalUsers,
        playersCount,
        coachesCount,
        caddiesCount,
        active7d,
        active30d,
        totalClubs,
        clubsWithAdmin,
        growthRate,
        totalVolume,
        currentMRR,
        avgBillingPerClub,
        flaggedIssues: flags.length,
      })

      // ── FINANCIAL TRENDS (Last 6 Months) ──────────────────────────
      const mrrTrendData = []
      const monthOffsets = [5, 4, 3, 2, 1, 0]
      
      for (const offset of monthOffsets) {
        const date = subMonths(now, offset)
        const label = format(date, 'MMM yyyy')
        const monthStart = startOfMonth(date)
        const monthEnd = endOfMonth(date)

        // Confirmed payments inside this month
        const monthPayments = payments.filter(p => {
          const paidAt = new Date(p.paid_at)
          return paidAt >= monthStart && paidAt <= monthEnd
        })
        const vol = monthPayments.reduce((sum, p) => sum + p.amount_kes, 0)
        
        // Active subscriptions at this month's end
        const paidCaddiesCount = caddies.filter(c => {
          const created = new Date(c.created_at)
          const paidUntil = c.paid_until ? new Date(c.paid_until) : null
          return created <= monthEnd && paidUntil && paidUntil >= monthEnd
        }).length
        
        const mrrVal = paidCaddiesCount * 280

        mrrTrendData.push({
          month: label,
          MRR: mrrVal,
          Volume: vol
        })
      }
      setMrrTrend(mrrTrendData)

      // ── USER DISTRIBUTION ──────────────────────────────────────────
      setUserDistribution([
        { name: 'Players', value: playersCount, color: '#39d353' },
        { name: 'Caddies', value: caddiesCount, color: '#235347' },
        { name: 'Coaches', value: coachesCount, color: '#8EB69B' }
      ].filter(u => u.value > 0))

      // ── CADDIE SUBSCRIPTION STATUSES ──────────────────────────────
      const activeCount = caddies.filter(c => c.is_active && c.paid_until && new Date(c.paid_until) > now).length
      const expiringCount = caddies.filter(c =>
        c.is_active && c.paid_until &&
        new Date(c.paid_until) > now &&
        new Date(c.paid_until) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      ).length
      const expiredCount = caddies.length - activeCount

      setSubStatusData([
        { name: 'Active', value: activeCount, color: '#10b981' },
        { name: 'Expiring Soon', value: expiringCount, color: '#f59e0b' },
        { name: 'Expired', value: expiredCount, color: '#ef4444' }
      ].filter(s => s.value > 0))

      // ── GOLFER ACTIVITY & ROUNDS ──────────────────────────────────
      const dailyRounds = []
      for (let i = 29; i >= 0; i--) {
        const day = subDays(now, i)
        const dateStr = format(day, 'yyyy-MM-dd')
        const count = rounds.filter(r => r.playedAt && r.playedAt.startsWith(dateStr)).length
        dailyRounds.push({
          date: format(day, 'dd MMM'),
          'Rounds Played': count
        })
      }
      setRoundsTrendData(dailyRounds)

      // Top courses played
      const courseCounts: { [key: string]: number } = {}
      rounds.forEach(r => {
        const name = r.courseName || 'Unknown Course'
        courseCounts[name] = (courseCounts[name] || 0) + 1
      })
      const topCourses = Object.entries(courseCounts).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count)
      setTopCoursesData(topCourses)

      // Average score by course
      const courseScores: { [key: string]: { sum: number; count: number } } = {}
      rounds.forEach(r => {
        const name = r.courseName || 'Unknown Course'
        if (r.totalScore) {
          if (!courseScores[name]) {
            courseScores[name] = { sum: 0, count: 0 }
          }
          courseScores[name].sum += r.totalScore
          courseScores[name].count++
        }
      })
      const avgScores = Object.entries(courseScores).map(([name, d]) => ({
        name,
        avgScore: parseFloat((d.sum / d.count).toFixed(1))
      })).sort((a, b) => b.avgScore - a.avgScore)
      setAvgScoresData(avgScores)

      // ── RETENTION & HEALTH RATIOS ─────────────────────────────────
      const playerRetention = playersCount > 0 ? Math.round((activePlayerIds30d.size / playersCount) * 100) : 0
      const caddieRenewal = caddiesCount > 0 ? Math.round((activePaidCaddies / caddiesCount) * 100) : 0
      const coachRetention = coachesCount > 0 ? Math.round((activePlayerIds30d.size / coachesCount) * 100) : 0 // using active rounds as generic activity flag

      setRetentionData([
        { name: 'Player Retention (30d)', value: playerRetention, fill: '#39d353' },
        { name: 'Caddie Renewal Rate', value: caddieRenewal, fill: '#235347' },
        { name: 'Coach Retention (30d)', value: coachRetention, fill: '#8EB69B' }
      ].filter(r => r.value > 0))

      // ── CLUBS HEALTH SCORE RANKING ────────────────────────────────
      const clubRows: ClubRow[] = clubs.map(club => {
        const clubCaddies = caddies.filter(c => c.club_id === club.id)
        const rosterSize = clubCaddies.length
        const activeSubs = clubCaddies.filter(c => c.paid_until && new Date(c.paid_until) > now).length
        const hasAdmin = admins.some(a => a.club_id === club.id)
        
        // Count actual check-ins at this club in the last 30 days
        const checkInCount30d = attendance.filter(a =>
          a.club_id === club.id &&
          a.time_in &&
          !a.is_absent &&
          new Date(a.date) > subDays(now, 30)
        ).length

        // Health Index weightings (no mock activity values)
        const healthScore = Math.min(100, Math.round(
          (activeSubs / (rosterSize || 1)) * 50 +
          (hasAdmin ? 30 : 0) +
          (checkInCount30d > 0 ? 20 : 0)
        ))

        let healthLabel: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical' = 'Good'
        if (healthScore >= 90) healthLabel = 'Excellent'
        else if (healthScore >= 70) healthLabel = 'Good'
        else if (healthScore >= 50) healthLabel = 'Needs Attention'
        else healthLabel = 'Critical'

        return {
          id: club.id,
          name: club.name || 'Sigona test',
          location: club.location || 'Nairobi, KE',
          rosterSize,
          activeSubs,
          hasAdmin,
          healthScore,
          healthLabel,
          checkInCount30d
        }
      })

      clubRows.sort((a, b) => b.healthScore - a.healthScore)
      setClubsRanking(clubRows)

    } catch (err) {
      console.error('Error loading platform analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlatformAnalytics()
  }, [])

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide operational efficiency, financial performance, and player rounds activity
          </p>
        </div>
        <button onClick={loadPlatformAnalytics} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Reload System Data
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-text-muted">
          Compiling platform metrics, parsing Supabase data and drawing charts…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top-Level KPI Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    System Volume (All-Time)
                  </span>
                  <span className="text-2xl font-black text-foreground">
                    KES {kpis.totalVolume.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1.5">
                    MRR Rate: <strong className="text-emerald-600 dark:text-emerald-400">KES {kpis.currentMRR.toLocaleString()}</strong>
                  </span>
                </div>
                <div className="bg-muted p-2 rounded-xl text-foreground">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Registered Users
                  </span>
                  <span className="text-2xl font-black text-foreground">
                    {kpis.totalUsers} Users
                  </span>
                  <div className="text-xs text-muted-foreground mt-1.5 flex gap-2">
                    <span className="badge badge-active py-0.5 px-1.5 text-[10px]">
                      {kpis.playersCount} Players
                    </span>
                    <span className="badge badge-info py-0.5 px-1.5 text-[10px]">
                      {kpis.caddiesCount} Caddies
                    </span>
                  </div>
                </div>
                <div className="bg-muted p-2 rounded-xl text-foreground">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Active Subscriptions
                  </span>
                  <span className="text-2xl font-black text-foreground">
                    {subStatusData.find(s => s.name === 'Active')?.value ?? 0} Caddies
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1.5">
                    Growth: <strong className="text-emerald-600 dark:text-emerald-400">+{kpis.growthRate}%</strong> MoM
                  </span>
                </div>
                <div className="bg-muted p-2 rounded-xl text-foreground">
                  <Award size={20} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Onboarded Clubs
                  </span>
                  <span className="text-2xl font-black text-foreground">
                    {kpis.totalClubs} Clubs
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1.5">
                    Admins Configured: <strong>{kpis.clubsWithAdmin} / {kpis.totalClubs}</strong>
                  </span>
                </div>
                <div className="bg-muted p-2 rounded-xl text-foreground">
                  <Building size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b" style={{ borderColor: 'var(--color-lighter)' }}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3.5 px-5 font-semibold text-sm transition-all relative ${
                activeTab === 'overview' ? 'text-primary' : 'text-text-muted opacity-60 hover:opacity-100'
              }`}
            >
              Overview Dashboard
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`pb-3.5 px-5 font-semibold text-sm transition-all relative ${
                activeTab === 'financials' ? 'text-primary' : 'text-text-muted opacity-60 hover:opacity-100'
              }`}
            >
              Financial Performance
              {activeTab === 'financials' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('rounds')}
              className={`pb-3.5 px-5 font-semibold text-sm transition-all relative ${
                activeTab === 'rounds' ? 'text-primary' : 'text-text-muted opacity-60 hover:opacity-100'
              }`}
            >
              Golfer Activity & Rounds
              {activeTab === 'rounds' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('clubs')}
              className={`pb-3.5 px-5 font-semibold text-sm transition-all relative ${
                activeTab === 'clubs' ? 'text-primary' : 'text-text-muted opacity-60 hover:opacity-100'
              }`}
            >
              Club Health Rankings
              {activeTab === 'clubs' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </div>

          {/* Tab 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Financial & User Charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 md:col-span-2">
                  <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>MRR Growth Trend</h3>
                  <p className="text-xs text-text-muted mb-6">Financial recurring subscriptions vs transaction volume</p>
                  
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={mrrTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mrrColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-lighter)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid var(--color-lighter)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area type="monotone" dataKey="MRR" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#mrrColor)" name="Monthly Revenue (KES)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>Subscription Status</h3>
                    <p className="text-xs text-text-muted mb-4">Roster billing health distribution</p>

                    {subStatusData.length === 0 ? (
                      <div className="h-[160px] flex items-center justify-center text-xs text-text-muted italic">
                        No caddie subscriptions found
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={subStatusData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {subStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {subStatusData.map(entry => (
                      <div key={entry.name} className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                          <span className="text-text-muted font-medium">{entry.name}</span>
                        </div>
                        <span className="font-bold">{entry.value} caddies</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ratios & Retention Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-1">User Base Share</h3>
                    <p className="text-xs text-text-muted mb-4">Breakdown by registered roles</p>

                    {userDistribution.length === 0 ? (
                      <div className="h-[165px] flex items-center justify-center text-xs text-text-muted italic">
                        No users registered in the database
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={165}>
                        <PieChart>
                          <Pie
                            data={userDistribution}
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {userDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-2 mt-2 text-xs">
                    {userDistribution.map(entry => (
                      <div key={entry.name} className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                          <span className="text-text-muted font-medium">{entry.name}</span>
                        </div>
                        <span className="font-bold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-6 md:col-span-2">
                  <h3 className="font-bold text-base mb-1">Active User Engagement</h3>
                  <p className="text-xs text-text-muted mb-6">User retention rate calculated from active monthly logs and round completions</p>
                  
                  {retentionData.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-xs text-text-muted italic">
                      Insufficient logs to compute user retention metrics
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      {retentionData.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-lighter/25 border" style={{ borderColor: 'var(--color-lighter)' }}>
                          <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="48" cy="48" r="40" stroke="var(--color-lighter)" strokeWidth="6" fill="transparent" />
                              <circle cx="48" cy="48" r="40" stroke={item.fill} strokeWidth="6" fill="transparent"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * item.value) / 100}
                                strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-lg font-black" style={{ color: 'var(--color-primary)' }}>{item.value}%</span>
                          </div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text)' }}>{item.name}</h4>
                          <p className="text-[10px] text-text-muted leading-tight">Calculated dynamically</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: FINANCIAL PERFORMANCE */}
          {activeTab === 'financials' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 md:col-span-2">
                <h3 className="font-bold text-base mb-1">Transaction Volumes</h3>
                <p className="text-xs text-text-muted mb-6">Confirmed Paystack transaction volumes over the last 6 months</p>

                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={mrrTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-lighter)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid var(--color-lighter)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Volume" fill="var(--color-primary)" name="Transaction Volume (KES)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-6">
                <div className="card p-5 bg-lighter/25 border" style={{ borderColor: 'var(--color-lighter)' }}>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Average Billing Per Club</span>
                  <span className="text-3xl font-black block mt-2 text-primary">
                    KES {kpis.avgBillingPerClub.toLocaleString()}
                  </span>
                  <span className="text-xs text-text-muted mt-1 block">Calculated dynamically across active clubs</span>
                </div>

                <div className="card p-5 bg-lighter/25 border" style={{ borderColor: 'var(--color-lighter)' }}>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Current MRR Rate</span>
                  <span className="text-3xl font-black block mt-2 text-primary">
                    KES {kpis.currentMRR.toLocaleString()}
                  </span>
                  <span className="text-xs text-text-muted mt-1 block">Caddie subscriptions alone</span>
                </div>

                <div className="card p-5 bg-lighter/25 border" style={{ borderColor: 'var(--color-lighter)' }}>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Est. Player Sub MRR</span>
                  <span className="text-3xl font-black block mt-2 text-primary">
                    KES {(kpis.playersCount * 500).toLocaleString()}
                  </span>
                  <span className="text-xs text-text-muted mt-1 block">Assuming KES 500 per month player rate</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: GOLFER ACTIVITY & ROUNDS */}
          {activeTab === 'rounds' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 md:col-span-2">
                  <h3 className="font-bold text-base mb-1">Rounds Completed Trend (Last 30 Days)</h3>
                  <p className="text-xs text-text-muted mb-6">Daily headcount of rounds recorded by golfers using the app</p>

                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={roundsTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="roundsColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-light)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--color-light)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-lighter)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="Rounds Played" stroke="var(--color-light)" fillOpacity={0.2} strokeWidth={2} fill="url(#roundsColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-1">Average Course Score</h3>
                    <p className="text-xs text-text-muted mb-4">Golfer score averages calculated per course</p>

                    {avgScoresData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-xs text-text-muted italic">
                        No round scores available
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                        {avgScoresData.map(c => (
                          <div key={c.name} className="flex justify-between items-center text-xs border-b pb-1.5" style={{ borderColor: 'var(--color-lighter)' }}>
                            <span className="font-semibold truncate max-w-[140px]">{c.name}</span>
                            <div className="flex items-center gap-1">
                              <Star size={11} className="fill-amber-400 text-amber-500" />
                              <strong className="font-black text-primary">{c.avgScore}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted text-center leading-normal">
                    Derived from 18-hole and 9-hole scores synced from user scorecards.
                  </p>
                </div>
              </div>

              {/* Top Courses Played bar chart */}
              <div className="card p-6">
                <h3 className="font-bold text-base mb-1">Course Popularity Roster</h3>
                <p className="text-xs text-text-muted mb-6">Total rounds tracked at individual golf courses in Kenya</p>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topCoursesData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-lighter)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-secondary)" name="Total Rounds Played" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tab 4: CLUBS HEALTH RANKING */}
          {activeTab === 'clubs' && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Club Platform Engagement Scores</h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Weighted score based on caddie attendance check-ins, active subscriptions, and secretary admin presence.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Club Details</th>
                      <th>Caddie Roster</th>
                      <th>Paid Subscriptions</th>
                      <th>Admin Presence</th>
                      <th>Club Activity Rate</th>
                      <th>Health Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubsRanking.map(club => (
                      <tr key={club.id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{club.name}</span>
                            <span className="text-xs text-text-muted">{club.location || 'KE'}</span>
                          </div>
                        </td>
                        <td className="font-semibold">{club.rosterSize} caddies</td>
                        <td>
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className="badge badge-active">{club.activeSubs} paid</span>
                            <span className="text-text-muted">({Math.round((club.activeSubs / (club.rosterSize || 1)) * 100)}%)</span>
                          </div>
                        </td>
                        <td>
                          {club.hasAdmin ? (
                            <span className="badge badge-active flex items-center gap-1 w-max">
                              <CheckCircle size={10} />
                              Active Secretary
                            </span>
                          ) : (
                            <span className="badge badge-suspended flex items-center gap-1 w-max">
                              <ShieldAlert size={10} />
                              Missing Admin
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-xs">
                            <Zap size={12} className="text-[#f59e0b]" />
                            <strong className="font-bold">{club.checkInCount30d}</strong> check-ins / 30d
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex-grow w-24 h-2 bg-lighter rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${club.healthScore}%`,
                                backgroundColor: club.healthScore >= 80 ? '#10b981' : club.healthScore >= 60 ? '#f59e0b' : '#ef4444'
                              }} />
                            </div>
                            <span className="font-black text-sm">{club.healthScore}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
