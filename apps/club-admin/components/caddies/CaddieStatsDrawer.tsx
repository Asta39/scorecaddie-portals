'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { format, differenceInMinutes, parseISO, subDays } from 'date-fns'
import { X, Calendar, Clock, Award, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

type Caddie = {
  id: string
  name: string
  phone: string
  experience_level: 'beginner' | 'intermediate' | 'expert'
  photo_url: string | null
}

type CaddieStatsDrawerProps = {
  caddie: Caddie | null
  isOpen: boolean
  onClose: () => void
}

export function CaddieStatsDrawer({ caddie, isOpen, onClose }: CaddieStatsDrawerProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    attendanceRate: number
    punctualityRate: number
    avgHours: number
    roundsWorked: number
    utilizationRate: number
    totalPresentDays: number
    history: { dateStr: string; timeIn: string | null; timeOut: string | null; status: string }[]
  } | null>(null)

  useEffect(() => {
    if (!caddie || !isOpen) return

    const loadCaddieStats = async () => {
      setLoading(true)
      const thirtyDaysAgo = subDays(new Date(), 30)
      const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd')

      try {
        // Load settings: get standard start time from localStorage
        let standardTime = '09:00'
        if (typeof window !== 'undefined') {
          const clubSettings = localStorage.getItem('scorecaddie_club_settings')
          if (clubSettings) {
            try {
              const parsed = JSON.parse(clubSettings)
              if (parsed.standardStartTime) standardTime = parsed.standardStartTime
            } catch (_) {}
          }
        }

        const [hThreshold, mThreshold] = standardTime.split(':').map(Number)

        // 1. Fetch caddie's attendance
        const attendanceRes = await supabase
          .from('caddie_attendance')
          .select('date, time_in, time_out, is_absent')
          .eq('caddie_id', caddie.id)
          .gte('date', thirtyDaysAgoStr)

        // 2. Fetch total unique active club days (to compute attendance rate fairly)
        const clubAttendanceRes = await supabase
          .from('caddie_attendance')
          .select('date')
          .gte('date', thirtyDaysAgoStr)

        // 3. Fetch completed bookings for this caddie
        const bookingsRes = await supabase
          .from('Booking')
          .select('id, amount_paid')
          .eq('provider_id', caddie.id)
          .eq('status', 'COMPLETED')
          .gte('booking_date', thirtyDaysAgo.toISOString())

        const attendanceRecords = attendanceRes.data ?? []
        const clubAttendanceRecords = clubAttendanceRes.data ?? []
        const bookingsCount = bookingsRes.data?.length ?? 0

        // Compute unique active club days in last 30 days
        const uniqueClubDays = new Set(clubAttendanceRecords.map(r => r.date)).size || 1

        // Statistics computations
        const presentRecords = attendanceRecords.filter(r => !r.is_absent && r.time_in)
        const totalPresentDays = presentRecords.length

        const attendanceRate = Math.round((totalPresentDays / uniqueClubDays) * 100)

        // Calculate Punctuality
        let onTimeCount = 0
        let totalTimeInCount = 0
        let totalMinutes = 0
        let minutesCount = 0

        presentRecords.forEach(r => {
          if (r.time_in) {
            totalTimeInCount++
            const checkInTime = new Date(r.time_in)
            const h = checkInTime.getHours()
            const m = checkInTime.getMinutes()
            if (h < hThreshold || (h === hThreshold && m <= mThreshold)) {
              onTimeCount++
            }

            if (r.time_out) {
              const checkOutTime = new Date(r.time_out)
              const diffMinutes = differenceInMinutes(checkOutTime, checkInTime)
              if (diffMinutes > 0) {
                totalMinutes += diffMinutes
                minutesCount++
              }
            }
          }
        });

        const punctualityRate = totalTimeInCount > 0 
          ? Math.round((onTimeCount / totalTimeInCount) * 100) 
          : 100

        const avgHours = minutesCount > 0 
          ? parseFloat((totalMinutes / minutesCount / 60).toFixed(1)) 
          : 0

        const utilizationRate = totalPresentDays > 0 
          ? Math.round((bookingsCount / totalPresentDays) * 100) 
          : 0

        // Sort original records chronologically descending using raw date string
        const sortedRecords = [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date))

        // Format history listing
        const history = sortedRecords.map(r => {
          let status = 'Absent'
          if (!r.is_absent) {
            status = r.time_out ? 'Completed' : 'On Site'
          }
          return {
            dateStr: format(parseISO(r.date), 'EEE, d MMM yyyy'),
            timeIn: r.time_in ? format(parseISO(r.time_in), 'hh:mm a') : null,
            timeOut: r.time_out ? format(parseISO(r.time_out), 'hh:mm a') : null,
            status
          }
        })

        setStats({
          attendanceRate,
          punctualityRate,
          avgHours,
          roundsWorked: bookingsCount,
          utilizationRate,
          totalPresentDays,
          history
        })
      } catch (err) {
        console.error('Error loading caddie statistics:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCaddieStats()
  }, [caddie, isOpen])

  if (!isOpen || !caddie) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'stretch',
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(8px)',
      transition: 'opacity 0.25s ease'
    }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        width: '420px',
        maxWidth: '100%',
        height: '100vh',
        borderRadius: '20px 0 0 20px',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#f2f2f7', // iOS Grouped Background
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.08)',
        borderLeft: '1px solid rgba(0, 0, 0, 0.05)',
        padding: '24px 20px',
        animation: 'slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4">
          <div className="flex items-center gap-3.5">
            {caddie.photo_url ? (
              <img src={caddie.photo_url} alt={caddie.name} className="w-12 h-12 rounded-full object-cover border border-white shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm border border-black/5">
                <span className="text-base font-bold text-primary">{caddie.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg leading-tight" style={{ color: '#000000', letterSpacing: '-0.02em' }}>
                {caddie.name}
              </h3>
              <p className="text-xs font-medium capitalize mt-0.5" style={{ color: '#8e8e93' }}>
                {caddie.experience_level} Caddie • Performance
              </p>
            </div>
          </div>
          <button 
            className="hover:opacity-75 transition-opacity" 
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(120, 120, 128, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8e8e93',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: '#8e8e93' }}>
            <RefreshCw className="animate-spin text-primary" size={20} />
            <span className="text-sm font-medium mt-1">Analyzing metrics...</span>
          </div>
        ) : stats ? (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Performance Analysis Indicator (iOS Style Banner Alert) */}
            {stats.attendanceRate >= 80 && stats.punctualityRate >= 80 ? (
              <div style={{
                background: '#e2f6ea',
                border: '1px solid #c3e6cb',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <CheckCircle size={18} className="mt-0.5" style={{ color: '#155724' }} />
                <div>
                  <h4 className="font-bold text-sm" style={{ color: '#155724', letterSpacing: '-0.01em' }}>Excellent Performance</h4>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#1b6d2e', fontWeight: 500 }}>
                    This caddie displays high reliability and consistently arrives on time. Highly recommended for marketplace bookings.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#fff9db',
                border: '1px solid #ffe8cc',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} className="mt-0.5" style={{ color: '#d9480f' }} />
                <div>
                  <h4 className="font-bold text-sm" style={{ color: '#d9480f', letterSpacing: '-0.01em' }}>Review Recommended</h4>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#e8590c', fontWeight: 500 }}>
                    Check-in attendance or punctuality is slightly below standard. Consider coaching on timeliness or active club presence.
                  </p>
                </div>
              </div>
            )}

            {/* Stats Summary Rows Grouped in iOS card style */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '4px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.04)'
            }}>
              {/* Row 1: Attendance Rate */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    background: '#007aff', // iOS Blue
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Calendar size={15} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#000000' }}>Attendance Rate</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-sm font-bold block" style={{ color: '#000000' }}>
                    {stats.attendanceRate}%
                  </span>
                  <span className="text-[10px] block" style={{ color: '#8e8e93', fontWeight: 500 }}>
                    {stats.totalPresentDays} present / 30d
                  </span>
                </div>
              </div>

              {/* Row 2: Punctuality */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    background: '#ff9500', // iOS Orange
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Clock size={15} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#000000' }}>Punctuality (On-Time)</span>
                </div>
                <div>
                  <span className="text-sm font-bold" style={{ color: stats.punctualityRate < 80 ? '#d9480f' : '#000000' }}>
                    {stats.punctualityRate}%
                  </span>
                </div>
              </div>

              {/* Row 3: Avg Daily Hours */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    background: '#5856d6', // iOS Indigo
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <TrendingUp size={15} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#000000' }}>Avg Daily Hours</span>
                </div>
                <div>
                  <span className="text-sm font-bold" style={{ color: '#000000' }}>
                    {stats.avgHours} hrs
                  </span>
                </div>
              </div>

              {/* Row 4: Rounds Worked */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0'
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    background: '#34c759', // iOS Green
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Award size={15} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#000000' }}>Rounds Worked</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-sm font-bold block" style={{ color: '#000000' }}>
                    {stats.roundsWorked} rounds
                  </span>
                  <span className="text-[10px] block" style={{ color: '#34c759', fontWeight: 600 }}>
                    {stats.utilizationRate}% utilization
                  </span>
                </div>
              </div>
            </div>

            {/* Roster & Attendance History */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Calendar size={13} style={{ color: '#8e8e93' }} />
                <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8e8e93' }}>
                  30-Day Attendance Logs
                </h4>
              </div>

              {/* Grouped list of attendance records */}
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '0 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.04)',
                overflow: 'hidden'
              }}>
                {stats.history.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium" style={{ color: '#8e8e93' }}>
                    No attendance records found in the last 30 days.
                  </div>
                ) : (
                  stats.history.map((log, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: index === stats.history.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)'
                      }}
                    >
                      <div>
                        <span className="text-xs font-semibold block" style={{ color: '#000000' }}>
                          {log.dateStr}
                        </span>
                        <span className="text-[10px] block mt-0.5" style={{ color: '#8e8e93', fontWeight: 500 }}>
                          {log.status === 'Absent' ? 'Marked Absent' : `In: ${log.timeIn || '—'} • Out: ${log.timeOut || '—'}`}
                        </span>
                      </div>
                      <div>
                        <span 
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '100px',
                            display: 'inline-block',
                            background: log.status === 'Completed' ? '#e2f6ea' : 
                                        log.status === 'On Site' ? '#e8f0fe' : '#fff0f0',
                            color: log.status === 'Completed' ? '#155724' : 
                                   log.status === 'On Site' ? '#1a73e8' : '#e03131',
                            border: log.status === 'Completed' ? '1px solid #c3e6cb' : 
                                    log.status === 'On Site' ? '1px solid #c2dbff' : '1px solid #ffc9c9'
                          }}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm font-medium" style={{ color: '#8e8e93' }}>
            Failed to parse caddie statistics.
          </div>
        )}
      </div>
      
      {/* Keyframe animation for slide-in */}
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

// Simple local spinner definition
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`feather feather-refresh-cw ${props.className}`}
    >
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  )
}
