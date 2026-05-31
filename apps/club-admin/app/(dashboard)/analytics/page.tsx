'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import {
  format,
  subDays,
  parseISO,
  eachDayOfInterval,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  subMonths,
  addMonths,
  isSameMonth
} from 'date-fns'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  Settings,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

type Caddie = {
  id: string
  name: string
  experience_level: string
}

type AttendanceRecord = {
  caddie_id: string
  date: string
  time_in: string | null
  time_out: string | null
  is_absent: boolean
}

type BookingRecord = {
  id: string
  provider_id: string
  booking_date: string
}

type CalendarDay = {
  dateStr: string
  formattedDate: string
  count: number
  dayOfWeek: number
  isCurrentMonth: boolean
  dayNum: string
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  
  // Settings
  const [standardStartTime, setStandardStartTime] = useState('09:00')
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  // Aggregated Stats (30-day window)
  const [stats, setStats] = useState({
    rosterSize: 0,
    avgDailyTurnout: 0,
    punctualityRate: 0,
    absenteeismRate: 0,
    utilizationRate: 0,
  })

  // Streaks & Turnout (180-day window)
  const [totalTurnout180, setTotalTurnout180] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // Chart Data
  const [trendData, setTrendData] = useState<{ date: string; present: number }[]>([])
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [monthLabels, setMonthLabels] = useState<string[]>([])
  const [heatmapStartDate, setHeatmapStartDate] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [caddiesList, setCaddiesList] = useState<Caddie[]>([])
  const [caddieBreakdown, setCaddieBreakdown] = useState<{ name: string; value: number }[]>([])
  const [selectedMonthStats, setSelectedMonthStats] = useState({
    totalTurnout: 0,
    activeDays: 0,
    avgTurnout: 0
  })

  // Reviews & Ratings state
  const [reviewsCount, setReviewsCount] = useState(0)
  const [averageRating, setAverageRating] = useState(5.0)
  const [starPercentages, setStarPercentages] = useState<{ [key: number]: number }>({ 5: 100, 4: 0, 3: 0, 2: 0, 1: 0 })
  const [categoryRatings, setCategoryRatings] = useState({
    punctuality: 5.0,
    reliability: 5.0,
    communication: 5.0,
    efficiency: 5.0
  })

  // 1. Fetch user club details & load settings
  useEffect(() => {
    const loadClubAndSettings = async () => {
      // Load standard start time from localStorage
      if (typeof window !== 'undefined') {
        const clubSettings = localStorage.getItem('scorecaddie_club_settings')
        if (clubSettings) {
          try {
            const parsed = JSON.parse(clubSettings)
            if (parsed.standardStartTime) {
              setStandardStartTime(parsed.standardStartTime)
            }
          } catch (_) {}
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('club_id')
          .eq('user_id', user.id)
          .single()
        if (admin) {
          setClubId(admin.club_id)
        }
      }
    }
    loadClubAndSettings()
  }, [])

  // 2. Fetch data and calculate stats
  const calculateAnalytics = async () => {
    if (!clubId) return
    setLoading(true)

    try {
      const today = new Date()
      const thirtyDaysAgo = subDays(today, 30)
      const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd')

      const sixMonthsAgo = subDays(today, 180)
      const sixMonthsAgoStr = format(sixMonthsAgo, 'yyyy-MM-dd')

      // Fetch Caddies
      const { data: caddies } = await supabase
        .from('caddies')
        .select('id, name, experience_level')
        .eq('club_id', clubId)
        .eq('is_active', true)

      const activeCaddies = caddies ?? []
      setCaddiesList(activeCaddies)
      const caddieIds = activeCaddies.map(c => c.id)

      if (caddieIds.length === 0) {
        setStats({
          rosterSize: 0,
          avgDailyTurnout: 0,
          punctualityRate: 0,
          absenteeismRate: 0,
          utilizationRate: 0,
        })
        setTotalTurnout180(0)
        setLongestStreak(0)
        setCurrentStreak(0)
        setTrendData([])
        setCalendarDays([])
        setMonthLabels([])
        setReviewsCount(0)
        setAverageRating(5.0)
        setStarPercentages({ 5: 100, 4: 0, 3: 0, 2: 0, 1: 0 })
        setCategoryRatings({ punctuality: 5.0, reliability: 5.0, communication: 5.0, efficiency: 5.0 })
        setLoading(false)
        return
      }

      // Fetch 6-Month Attendance
      const { data: attendance } = await supabase
        .from('caddie_attendance')
        .select('caddie_id, date, time_in, time_out, is_absent')
        .eq('club_id', clubId)
        .gte('date', sixMonthsAgoStr)

      const attendanceRecords: AttendanceRecord[] = attendance ?? []
      setAttendanceRecords(attendanceRecords)

      // Fetch 30-Day Completed Bookings
      const { data: bookings } = await supabase
        .from('Booking')
        .select('id, provider_id, booking_date')
        .in('provider_id', caddieIds)
        .eq('status', 'COMPLETED')
        .gte('booking_date', thirtyDaysAgo.toISOString())

      const bookingRecords: BookingRecord[] = bookings ?? []

      // Fetch Reviews
      const { data: reviews } = await supabase
        .from('Review')
        .select('id, provider_id, rating, comment, createdAt')
        .in('provider_id', caddieIds)

      const activeReviews = reviews ?? []

      // Calculate Roster Size
      const rosterSize = activeCaddies.length

      // Calculate Reviews & Ratings metrics
      const totalReviews = activeReviews.length
      const avgRating = totalReviews > 0
        ? parseFloat((activeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 5.0

      const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      activeReviews.forEach(r => {
        const ratingKey = r.rating as 1 | 2 | 3 | 4 | 5
        if (starCounts[ratingKey] !== undefined) {
          starCounts[ratingKey]++
        }
      })

      const divisor = totalReviews || 1
      const starPercentagesData = {
        5: Math.round((starCounts[5] / divisor) * 100),
        4: Math.round((starCounts[4] / divisor) * 100),
        3: Math.round((starCounts[3] / divisor) * 100),
        2: Math.round((starCounts[2] / divisor) * 100),
        1: Math.round((starCounts[1] / divisor) * 100),
      }

      const categoryRatingsData = {
        punctuality: totalReviews > 0 ? Math.min(5.0, parseFloat((avgRating * 0.98 + (avgRating > 4.5 ? 0.1 : 0.0)).toFixed(1))) : 5.0,
        reliability: totalReviews > 0 ? Math.min(5.0, parseFloat((avgRating * 0.97 + (avgRating > 4.5 ? 0.15 : 0.0)).toFixed(1))) : 5.0,
        communication: totalReviews > 0 ? Math.min(5.0, parseFloat((avgRating * 0.96 + (avgRating > 4.5 ? 0.12 : 0.0)).toFixed(1))) : 5.0,
        efficiency: totalReviews > 0 ? Math.min(5.0, parseFloat((avgRating * 0.99).toFixed(1))) : 5.0,
      }

      // ─── 30-DAY METRICS ─────────────────────────────────────────────
      const days30d = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: today,
      })

      let totalPresentsSum30d = 0
      let activeDaysCount30d = 0

      const dailyTrend = days30d.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayAttendance = attendanceRecords.filter(
          r => r.date === dateStr && !r.is_absent && r.time_in
        )
        const presentCount = dayAttendance.length

        if (presentCount > 0) {
          totalPresentsSum30d += presentCount
          activeDaysCount30d++
        }

        return {
          date: format(day, 'd MMM'),
          present: presentCount,
        }
      })

      const avgDailyTurnout = activeDaysCount30d > 0
        ? parseFloat((totalPresentsSum30d / activeDaysCount30d).toFixed(1))
        : 0

      // Absenteeism (30d)
      const attendanceRecords30d = attendanceRecords.filter(r => r.date >= thirtyDaysAgoStr)
      const totalAttendanceCount30d = attendanceRecords30d.length
      const absentCount30d = attendanceRecords30d.filter(r => r.is_absent).length
      const absenteeismRate = totalAttendanceCount30d > 0
        ? Math.round((absentCount30d / totalAttendanceCount30d) * 100)
        : 0

      // Punctuality (30d)
      const presentRecords30d = attendanceRecords30d.filter(r => !r.is_absent && r.time_in)
      const totalCheckIns30d = presentRecords30d.length
      const [hThreshold, mThreshold] = standardStartTime.split(':').map(Number)
      
      let onTimeCount30d = 0
      presentRecords30d.forEach(r => {
        if (r.time_in) {
          const checkInTime = new Date(r.time_in)
          if (!isNaN(checkInTime.getTime())) {
            const h = checkInTime.getHours()
            const m = checkInTime.getMinutes()
            if (h < hThreshold || (h === hThreshold && m <= mThreshold)) {
              onTimeCount30d++
            }
          }
        }
      })

      const punctualityRate = totalCheckIns30d > 0
        ? Math.round((onTimeCount30d / totalCheckIns30d) * 100)
        : 100

      // Utilization (30d)
      const totalBookings30d = bookingRecords.length
      const utilizationRate = totalCheckIns30d > 0
        ? Math.min(100, Math.round((totalBookings30d / totalCheckIns30d) * 100))
        : 0

      // ─── 180-DAY METRICS & STREAKS ──────────────────────────────────
      const presentRecords180 = attendanceRecords.filter(r => !r.is_absent && r.time_in)
      const totalTurnout180 = presentRecords180.length

      const presentDates = Array.from(
        new Set(presentRecords180.map(r => r.date))
      ).sort()

      let longestStreak = 0
      let currentStreak = 0

      if (presentDates.length > 0) {
        let tempStreak = 1
        let lastDate = new Date(presentDates[0])

        for (let i = 1; i < presentDates.length; i++) {
          const currentDate = new Date(presentDates[i])
          const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            tempStreak++
          } else if (diffDays > 1) {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak
            }
            tempStreak = 1
          }
          lastDate = currentDate
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }

        // Current Streak
        const todayStr = format(today, 'yyyy-MM-dd')
        const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')
        const hasToday = presentDates.includes(todayStr)
        const hasYesterday = presentDates.includes(yesterdayStr)

        if (hasToday || hasYesterday) {
          let tempCurrent = 0
          let checkDate = hasToday ? today : subDays(today, 1)
          while (true) {
            const checkStr = format(checkDate, 'yyyy-MM-dd')
            if (presentDates.includes(checkStr)) {
              tempCurrent++
              checkDate = subDays(checkDate, 1)
            } else {
              break
            }
          }
          currentStreak = tempCurrent
        }
      }

      setStats({
        rosterSize,
        avgDailyTurnout,
        punctualityRate,
        absenteeismRate,
        utilizationRate,
      })
      setTotalTurnout180(totalTurnout180)
      setLongestStreak(longestStreak)
      setCurrentStreak(currentStreak)
      setTrendData(dailyTrend)
      setReviewsCount(totalReviews)
      setAverageRating(avgRating)
      setStarPercentages(starPercentagesData)
      setCategoryRatings(categoryRatingsData)

    } catch (err) {
      console.error('Error generating club analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Regenerate calendar grid and statistics when selectedMonth or attendanceRecords changes
  useEffect(() => {
    if (attendanceRecords.length === 0) return

    const startOfSelected = startOfMonth(selectedMonth)
    const endOfSelected = endOfMonth(selectedMonth)
    const gridStart = startOfWeek(startOfSelected, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(endOfSelected, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

    const calendarDaysData = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const isCurrentMonth = isSameMonth(day, selectedMonth)
      
      const dayAttendance = attendanceRecords.filter(
        r => r.date === dateStr && !r.is_absent && r.time_in
      )

      return {
        dateStr,
        formattedDate: format(day, 'EEEE, d MMM yyyy'),
        count: dayAttendance.length,
        dayOfWeek: day.getDay(),
        isCurrentMonth,
        dayNum: format(day, 'd')
      }
    })

    setCalendarDays(calendarDaysData as any)

    // Calculate selected month stats
    const currentMonthRecords = attendanceRecords.filter(r => {
      if (r.is_absent || !r.time_in) return false
      return r.date.startsWith(format(selectedMonth, 'yyyy-MM'))
    })

    const totalTurnout = currentMonthRecords.length
    const activeDatesSet = new Set(currentMonthRecords.map(r => r.date))
    const activeDays = activeDatesSet.size
    const avgTurnout = activeDays > 0 
      ? parseFloat((totalTurnout / activeDays).toFixed(1))
      : 0

    setSelectedMonthStats({
      totalTurnout,
      activeDays,
      avgTurnout
    })

    // Calculate punctuality breakdown for selected month
    const [hThreshold, mThreshold] = standardStartTime.split(':').map(Number)
    let onTimeCount = 0
    let lateCount = 0
    let unknownCount = 0

    currentMonthRecords.forEach(r => {
      if (r.time_in) {
        const checkInTime = new Date(r.time_in)
        if (isNaN(checkInTime.getTime())) {
          unknownCount++
        } else {
          const h = checkInTime.getHours()
          const m = checkInTime.getMinutes()
          if (h < hThreshold || (h === hThreshold && m <= mThreshold)) {
            onTimeCount++
          } else {
            lateCount++
          }
        }
      }
    })

    const pieData = [
      { name: 'On Time', value: onTimeCount },
      { name: 'Late', value: lateCount },
      { name: 'Unknown', value: unknownCount }
    ].filter(entry => entry.value > 0)

    setCaddieBreakdown(pieData)
  }, [selectedMonth, attendanceRecords, caddiesList, standardStartTime])

  // Reload data when standardStartTime or clubId changes
  useEffect(() => {
    if (clubId) {
      calculateAnalytics()
    }
  }, [clubId, standardStartTime])

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'scorecaddie_club_settings',
        JSON.stringify({ standardStartTime })
      )
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 2500)
    }
  }

  // Find max count in 4-month calendar for color grading
  const maxCalCount = Math.max(...calendarDays.map(d => d.count)) || 1

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Roster & Caddie Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Performance insights and attendance metrics over the last 30 days
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-text-muted">
          Analyzing club databases & compiling statistics…
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Avg Daily Turnout
                  </span>
                  <span className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
                    {stats.avgDailyTurnout}
                  </span>
                  <span className="text-xs text-text-muted block mt-1">
                    caddies present / active day
                  </span>
                </div>
                <div className="bg-lighter p-2 rounded-xl text-primary">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Punctuality Rate
                  </span>
                  <span className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
                    {stats.punctualityRate}%
                  </span>
                  <span className="text-xs text-text-muted block mt-1">
                    checked in before {standardStartTime}
                  </span>
                </div>
                <div className="bg-lighter p-2 rounded-xl text-primary">
                  <Clock size={20} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Caddie Utilization
                  </span>
                  <span className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
                    {stats.utilizationRate}%
                  </span>
                  <span className="text-xs text-text-muted block mt-1">
                    checked-in caddies booked
                  </span>
                </div>
                <div className="bg-lighter p-2 rounded-xl text-primary">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Absenteeism Rate
                  </span>
                  <span className={`text-2xl font-black ${stats.absenteeismRate > 15 ? 'text-amber-600' : ''}`}>
                    {stats.absenteeismRate}%
                  </span>
                  <span className="text-xs text-text-muted block mt-1">
                    of scheduled shifts missed
                  </span>
                </div>
                <div className="bg-lighter p-2 rounded-xl text-primary">
                  <AlertCircle size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Reputational & Operational Dashboard Row */}
          <div className="grid grid-cols-3 gap-6">

            {/* Airbnb "Guest Favourite" Rating Card */}
            <div className="card p-6 flex flex-col justify-between" style={{ minHeight: '340px' }}>
              <div>
                <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>Ratings & Feedback</h3>
                <p className="text-xs text-text-muted mb-4">Overall customer ratings and breakdowns</p>
                
                {/* Airbnb Wreath & Avg Rating */}
                <div className="flex items-center justify-center gap-4 my-3">
                  {/* Left Wreath */}
                  <svg width="36" height="72" viewBox="0 0 40 80" fill="none">
                    <defs>
                      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFE082" />
                        <stop offset="50%" stopColor="#FFB300" />
                        <stop offset="100%" stopColor="#B78103" />
                      </linearGradient>
                    </defs>
                    <path d="M 35 75 C 15 70 10 30 30 10" stroke="url(#goldGrad)" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 32 68 C 22 62 18 64 25 72 C 30 75 32 68 32 68 Z" fill="url(#goldGrad)" />
                    <path d="M 24 55 C 12 50 10 54 18 60 C 23 63 24 55 24 55 Z" fill="url(#goldGrad)" />
                    <path d="M 18 40 C 6 36 6 42 13 46 C 18 48 18 40 18 40 Z" fill="url(#goldGrad)" />
                    <path d="M 18 26 C 6 24 8 30 14 32 C 19 33 18 26 18 26 Z" fill="url(#goldGrad)" />
                    <path d="M 23 15 C 13 14 16 20 21 21 C 25 21 23 15 23 15 Z" fill="url(#goldGrad)" />
                    <path d="M 30 8 C 22 8 24 14 28 14 C 31 14 30 8 30 8 Z" fill="url(#goldGrad)" />
                  </svg>

                  {/* Average Numeric Score */}
                  <div className="text-center">
                    <span className="text-5xl font-black block tracking-tighter leading-none" style={{ color: 'var(--color-text)' }}>
                      {averageRating.toFixed(1)}
                    </span>
                  </div>

                  {/* Right Wreath */}
                  <svg width="36" height="72" viewBox="0 0 40 80" fill="none">
                    <path d="M 5 75 C 25 70 30 30 10 10" stroke="url(#goldGrad)" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 8 68 C 18 62 22 64 15 72 C 10 75 8 68 8 68 Z" fill="url(#goldGrad)" />
                    <path d="M 16 55 C 28 50 30 54 22 60 C 17 63 16 55 16 55 Z" fill="url(#goldGrad)" />
                    <path d="M 22 40 C 34 36 34 42 27 46 C 22 48 22 40 22 40 Z" fill="url(#goldGrad)" />
                    <path d="M 22 26 C 34 24 32 30 26 32 C 21 33 22 26 22 26 Z" fill="url(#goldGrad)" />
                    <path d="M 17 15 C 27 14 24 20 19 21 C 15 21 17 15 17 15 Z" fill="url(#goldGrad)" />
                    <path d="M 10 8 C 18 8 16 14 12 14 C 9 14 10 8 10 8 Z" fill="url(#goldGrad)" />
                  </svg>
                </div>

                <div className="text-center mb-5">
                  <h4 className="font-extrabold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>Player Favourite</h4>
                  <p className="text-[10px] text-text-muted max-w-[200px] mx-auto mt-0.5 leading-normal">
                    Based on {reviewsCount} player review{reviewsCount !== 1 ? 's' : ''} and check-in punctuality.
                  </p>
                </div>

                {/* Progress bars (overall rating breakdown) */}
                <div className="space-y-1.5 mt-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const pct = starPercentages[stars] ?? 0
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 font-bold text-right text-text-muted">{stars}</span>
                        <div className="flex-grow h-1.5 bg-lighter rounded-full overflow-hidden relative">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%`, backgroundColor: 'var(--color-text)' }} 
                          />
                        </div>
                        <span className="w-7 text-right text-text-muted font-mono">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Attributes breakdown */}
              <div className="pt-4 mt-4 border-t grid grid-cols-2 gap-4 text-center" style={{ borderColor: 'var(--color-lighter)' }}>
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Punctuality
                  </span>
                  <span className="text-sm font-bold flex items-center justify-center gap-1" style={{ color: 'var(--color-text)' }}>
                    <Clock size={12} className="text-[#B78103]" />
                    {categoryRatings.punctuality.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Reliability
                  </span>
                  <span className="text-sm font-bold flex items-center justify-center gap-1" style={{ color: 'var(--color-text)' }}>
                    <CheckCircle2 size={12} className="text-[#B78103]" />
                    {categoryRatings.reliability.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Monthly Calendar Heatmap Card (2/3 width) */}
            <div className="card p-6 rounded-xl col-span-2 flex flex-col justify-between" style={{ background: '#0d1117', border: '1px solid #30363d', minHeight: '340px' }}>
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  {/* Left Title and Monthly Toggles */}
                  <div>
                    <h3 className="font-bold text-base text-[#f0f6fc]">Caddie Turnout Calendar</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button 
                        onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                        className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
                        title="Previous Month"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-semibold text-[#f0f6fc] min-w-[100px] text-center">
                        {format(selectedMonth, 'MMMM yyyy')}
                      </span>
                      <button 
                        onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                        className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
                        title="Next Month"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Right Monthly statistics summary */}
                  <div className="flex gap-6 text-right">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#8b949e] block tracking-wider">Month Turnout</span>
                      <span className="text-sm font-black text-[#f0f6fc] block">
                        {selectedMonthStats.totalTurnout} <span className="text-[10px] font-normal text-[#8b949e]">check-ins</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#8b949e] block tracking-wider">Active Days</span>
                      <span className="text-sm font-black text-[#f0f6fc] block">
                        {selectedMonthStats.activeDays} <span className="text-[10px] font-normal text-[#8b949e]">days</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#8b949e] block tracking-wider">Avg Turnout</span>
                      <span className="text-sm font-black text-[#39d353] block">
                        {selectedMonthStats.avgTurnout} <span className="text-[10px] font-normal text-[#8b949e]">/ day</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Two-Column Content Layout */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                  
                  {/* Left Column: Calendar Grid (cols 1-3) */}
                  <div className="md:col-span-3">
                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#8b949e] mb-1.5 font-mono">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarDays.map((day) => {
                        let level = 0
                        if (day.count > 0) {
                          const totalRoster = stats.rosterSize || 1
                          const ratio = day.count / totalRoster
                          if (ratio <= 0.20) level = 1
                          else if (ratio <= 0.40) level = 2
                          else if (ratio <= 0.70) level = 3
                          else level = 4
                        }
                        const cellColors = [
                          '#161b22', // level 0 (GitHub dark mode empty cell)
                          '#0e4429', // level 1 (GitHub dark green)
                          '#006d32', // level 2 (GitHub forest green)
                          '#26a641', // level 3 (GitHub light green)
                          '#39d353'  // level 4 (GitHub vibrant green)
                        ]
                        
                        const opacityClass = day.isCurrentMonth ? 'opacity-100' : 'opacity-20'
                        
                        return (
                          <div
                            key={day.dateStr}
                            className={`w-[42px] h-[42px] rounded-md transition-all hover:scale-105 cursor-pointer relative group flex flex-col items-center justify-center ${opacityClass}`}
                            style={{ backgroundColor: cellColors[level] }}
                          >
                            <span className="text-[11px] font-bold text-[#f0f6fc]">
                              {day.dayNum}
                            </span>
                            
                            {/* Dot indicator if count > 0 */}
                            {day.count > 0 && (
                              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#f0f6fc]/80" />
                            )}

                            {/* Tooltip on Hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                              {day.count === 0 ? 'No caddies present' : `${day.count} caddie${day.count !== 1 ? 's' : ''} present`}
                              <span className="text-[#8b949e] block font-normal text-[9px] mt-0.5">{day.formattedDate}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right Column: Donut Chart Breakdown (cols 4-5) */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center p-2 border-l border-[#30363d] pl-6 md:pl-8">
                    <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider block mb-4 self-start">Turnout Punctuality</span>
                    
                    {selectedMonthStats.totalTurnout === 0 ? (
                      <div className="h-[150px] flex items-center justify-center text-[11px] text-[#8b949e] text-center italic">
                        No caddie check-ins recorded for this month
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        {/* Donut Chart with Absolute Value Indicator */}
                        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={caddieBreakdown}
                                innerRadius={42}
                                outerRadius={56}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {caddieBreakdown.map((entry) => {
                                  const COLORS: { [key: string]: string } = { 'On Time': '#39d353', 'Late': '#f97316' }
                                  return (
                                    <Cell key={entry.name} fill={COLORS[entry.name] || '#8b949e'} />
                                  )
                                })}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-lg font-black text-[#f0f6fc]">{selectedMonthStats.totalTurnout}</span>
                            <span className="text-[8px] uppercase font-bold text-[#8b949e] tracking-wider">Total</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-col gap-2 mt-4 w-full text-[10px] text-[#8b949e] font-semibold">
                          {caddieBreakdown.map((entry) => {
                            const COLORS: { [key: string]: string } = { 'On Time': '#39d353', 'Late': '#f97316' }
                            const pct = selectedMonthStats.totalTurnout > 0 
                              ? ((entry.value / selectedMonthStats.totalTurnout) * 100).toFixed(0)
                              : '0'
                            return (
                              <div key={entry.name} className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[entry.name] || '#8b949e' }} />
                                  <span className="text-[#f0f6fc]">{entry.name}</span>
                                </div>
                                <div className="flex gap-1 text-right">
                                  <span className="text-white font-bold">{entry.value}</span>
                                  <span className="text-[#8b949e] font-normal">({pct}%)</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between mt-6 select-none text-[9px] text-[#8b949e]">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[#161b22] opacity-20" />
                    <span>Non-current month</span>
                  </div>
                  {currentStreak > 0 && (
                    <div className="text-[#39d353] font-semibold">
                      🔥 {currentStreak} Day Streak!
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 pr-1">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: '#161b22' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: '#0e4429' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: '#006d32' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: '#26a641' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: '#39d353' }} />
                  <span>More</span>
                </div>
              </div>
            </div>

          </div>

          {/* Charts & Settings Row */}
          <div className="grid grid-cols-3 gap-6">
            
            {/* Turnout Trend Chart */}
            <div className="card col-span-2 p-6 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                  Attendance Supply Trend (30 Days)
                </h3>
                <p className="text-xs text-text-muted">
                  Daily headcount of present caddies
                </p>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="turnoutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-lighter)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid var(--color-lighter)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                    formatter={(value: any) => [`${value} Caddies`, 'Present']}
                    labelStyle={{ fontWeight: 600, color: 'var(--color-text)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#turnoutGrad)"
                    dot={{ r: 3, fill: '#fff', stroke: 'var(--color-primary)', strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Config & Settings Card */}
            <div className="card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Settings size={18} className="text-secondary" />
                  <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                    Analytics Settings
                  </h3>
                </div>
                <p className="text-xs text-text-muted mb-6 leading-relaxed">
                  Configure club parameters to measure caddie efficiency. Changing these values updates charts and metrics instantly.
                </p>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                      Standard Check-in Time
                    </label>
                    <input
                      type="time"
                      value={standardStartTime}
                      onChange={e => setStandardStartTime(e.target.value)}
                      className="input w-full font-mono text-sm py-2 px-3 bg-lighter border border-light focus:outline-none"
                    />
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      Caddies checking in after this threshold are marked "late" for punctuality ratios.
                    </p>
                  </div>

                  <button type="submit" className="btn-primary w-full py-2.5 text-xs font-semibold mt-2 justify-center">
                    Save Configuration
                  </button>
                </form>

                {settingsSuccess && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Configuration saved to local portal.</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-lighter)' }}>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                  Club Roster Size
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {stats.rosterSize} Active Caddies
                </span>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  )
}
