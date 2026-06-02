'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns'
import { Calendar as CalendarIcon, Check, X, Clock, AlertCircle, ChevronLeft, ChevronRight, User, Search, Download } from 'lucide-react'

type Caddie = {
  id: string
  name: string
  phone: string
  is_present: boolean
  paid_until: string | null
}

type Attendance = {
  id: string
  caddie_id: string
  date: string
  time_in: string | null
  time_out: string | null
  is_absent: boolean
}

export default function RosterPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [caddies, setCaddies] = useState<Caddie[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  )
  const [clubId, setClubId] = useState<string | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal selection state
  const [selectedCell, setSelectedCell] = useState<{
    caddie: Caddie
    date: Date
    record?: Attendance
  } | null>(null)
  const [customTimeIn, setCustomTimeIn] = useState('')
  const [customTimeOut, setCustomTimeOut] = useState('')

  // 1. Fetch user club details
  useEffect(() => {
    const loadClub = async () => {
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
    loadClub()
  }, [])

  // 2. Fetch caddies and attendance records for the current week
  const fetchRosterData = async () => {
    if (!clubId) return
    setLoading(true)

    const startOfCurrentWeekStr = format(currentWeekStart, 'yyyy-MM-dd')
    const endOfWeekStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd')

    const [caddiesRes, attendanceRes] = await Promise.all([
      supabase
        .from('caddies')
        .select('id, name, phone, is_present, paid_until')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('caddie_attendance')
        .select('*')
        .eq('club_id', clubId)
        .gte('date', startOfCurrentWeekStr)
        .lte('date', endOfWeekStr)
    ])

    if (caddiesRes.data) setCaddies(caddiesRes.data)
    if (attendanceRes.data) setAttendance(attendanceRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (clubId) {
      fetchRosterData()
    }
  }, [clubId, currentWeekStart])

  // 3. Realtime subscription for instant updates
  useEffect(() => {
    if (!clubId) return

    const channel = supabase
      .channel('roster-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caddie_attendance',
          filter: `club_id=eq.${clubId}`
        },
        () => {
          fetchRosterData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clubId, currentWeekStart])

  // Generate day columns dynamically
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const filteredCaddies = useMemo(() => {
    if (!searchQuery) return caddies
    return caddies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [caddies, searchQuery])

  const exportCSV = () => {
    const headers = ['Caddie Name', ...weekDays.map(d => format(d, 'EEE d MMM'))].join(',')
    const rows = filteredCaddies.map(caddie => {
      const row = [`"${caddie.name}"`]
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const record = attendance.find(a => a.caddie_id === caddie.id && a.date === dateStr)
        if (record) {
          if (record.is_absent) row.push('Absent')
          else if (record.time_in && record.time_out) row.push(`"${format(parseISO(record.time_in), 'HH:mm')} - ${format(parseISO(record.time_out), 'HH:mm')}"`)
          else if (record.time_in) row.push(`"IN ${format(parseISO(record.time_in), 'HH:mm')}"`)
          else row.push('-')
        } else {
          row.push('-')
        }
      })
      return row.join(',')
    })
    
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roster-${format(currentWeekStart, 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCellClick = (caddie: Caddie, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const record = attendance.find(a => a.caddie_id === caddie.id && a.date === dateStr)
    
    // Prefill custom inputs
    setCustomTimeIn(record?.time_in ? format(parseISO(record.time_in), 'HH:mm') : '08:00')
    setCustomTimeOut(record?.time_out ? format(parseISO(record.time_out), 'HH:mm') : '16:00')
    
    setSelectedCell({ caddie, date, record })
  }

  const handleSaveAttendance = async (action: 'check_in' | 'check_out' | 'absent' | 'clear') => {
    if (!selectedCell || !clubId) return
    const { caddie, date } = selectedCell
    const dateStr = format(date, 'yyyy-MM-dd')
    const isToday = isSameDay(date, new Date())

    let timeIn: string | null = null
    let timeOut: string | null = null
    let isAbsent = false
    let deleteRecord = false

    if (action === 'check_in') {
      const now = new Date()
      const d = new Date(date)
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
      timeIn = d.toISOString()
    } else if (action === 'check_out') {
      timeIn = selectedCell.record?.time_in || null
      if (!timeIn) {
        const dIn = new Date(date)
        dIn.setHours(8, 0, 0, 0)
        timeIn = dIn.toISOString()
      }
      const now = new Date()
      const d = new Date(date)
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
      timeOut = d.toISOString()
    } else if (action === 'absent') {
      isAbsent = true
    } else if (action === 'clear') {
      deleteRecord = true
    }

    try {
      if (deleteRecord) {
        if (selectedCell.record) {
          await supabase
            .from('caddie_attendance')
            .delete()
            .eq('id', selectedCell.record.id)
        }
      } else {
        await supabase
          .from('caddie_attendance')
          .upsert({
            caddie_id: caddie.id,
            club_id: clubId,
            date: dateStr,
            time_in: timeIn,
            time_out: timeOut,
            is_absent: isAbsent,
          }, { onConflict: 'caddie_id,date' })
      }

      // If updating today's record, update presence state on the caddie
      if (isToday) {
        const isPresentNow = action === 'check_in'
        await supabase
          .from('caddies')
          .update({ is_present: isPresentNow })
          .eq('id', caddie.id)
      }

      fetchRosterData()
      setSelectedCell(null)
    } catch (err) {
      console.error('Failed to save attendance:', err)
    }
  }

  const navigateWeek = (direction: 'next' | 'prev') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7))
  }

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Weekly Roster</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Check caddies in/out and manage daily presence at the club
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-3 bg-white border border-light rounded-xl p-1.5 shadow-sm">
          <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-lighter rounded-lg text-primary">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-text px-1">
            Week of {format(currentWeekStart, 'd MMMM yyyy')}
          </span>
          <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-lighter rounded-lg text-primary">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search caddie name..."
            className="input w-64"
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-text-muted">
          Loading roster data…
        </div>
      ) : (
        <div className="card h-full flex flex-col">
          <div className="table-responsive-wrapper flex-1">
            <table className="data-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Caddie Name</th>
                {weekDays.map(day => (
                  <th key={day.toString()} className="text-center" style={{ textAlign: 'center' }}>
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-[10px] mt-0.5 text-text-muted">{format(day, 'd MMM')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCaddies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                         <User size={22} style={{ color: 'var(--color-secondary)' }} />
                      </div>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>No caddies found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCaddies.map(caddie => (
                  <tr key={caddie.id}>
                    <td className="font-semibold truncate">
                      <div className="flex flex-col">
                        <span>{caddie.name}</span>
                        <span className="text-xs font-normal" style={{ color: 'var(--color-light)' }}>{caddie.phone}</span>
                      </div>
                    </td>
                    
                    {weekDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const record = attendance.find(a => a.caddie_id === caddie.id && a.date === dateStr)
                      
                      let cellContent = (
                        <span className="text-xs font-medium" style={{ color: 'var(--color-light)' }}>—</span>
                      )
                      let cellClass = "cursor-pointer hover:bg-lighter/30 text-center py-4"
                      
                      if (record) {
                        if (record.is_absent) {
                          cellContent = (
                            <span className="badge badge-suspended text-[11px] mx-auto block w-max">Absent</span>
                          )
                        } else if (record.time_in && record.time_out) {
                          cellContent = (
                            <div className="text-[11px] font-semibold flex flex-col justify-center items-center w-full">
                              <span style={{ color: 'var(--color-primary)' }}>{format(parseISO(record.time_in), 'HH:mm')}</span>
                              <span style={{ color: 'var(--color-light)' }}>{format(parseISO(record.time_out), 'HH:mm')}</span>
                            </div>
                          )
                        } else if (record.time_in) {
                          cellContent = (
                            <div className="flex flex-col items-center justify-center w-full">
                              <span className="badge badge-active text-[11px] font-bold">IN</span>
                              <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-primary)' }}>{format(parseISO(record.time_in), 'HH:mm')}</span>
                            </div>
                          )
                        }
                      }

                      return (
                        <td key={dateStr} className={cellClass} onClick={() => handleCellClick(caddie, day)}>
                          <div className="flex flex-col items-center justify-center min-h-[36px] w-full text-center">
                            {cellContent}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Detail Sheet Modal */}
      {selectedCell && (
        <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: 'var(--color-light)' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  {selectedCell.record ? 'Edit Attendance' : 'Mark Attendance'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedCell.caddie.name} · {format(selectedCell.date, 'EEEE, d MMM yyyy')}
                </p>
              </div>
              <button className="p-1 hover:bg-lighter rounded-lg text-primary" onClick={() => setSelectedCell(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button className="btn-primary py-3 justify-center text-sm font-semibold"
                  style={{ background: 'var(--color-primary)' }}
                  onClick={() => handleSaveAttendance('check_in')}>
                  <Check size={16} />
                  Check In
                </button>
                <button className="btn-primary py-3 justify-center text-sm font-semibold"
                  style={{ background: 'var(--color-secondary)' }}
                  onClick={() => handleSaveAttendance('check_out')}>
                  <Clock size={16} />
                  Check Out
                </button>
              </div>

              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-lighter)' }}>
                <button className="btn-secondary py-3 flex-1 justify-center text-sm font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => handleSaveAttendance('absent')}>
                  Mark Absent
                </button>
                {selectedCell.record && (
                  <button className="btn-secondary py-3 flex-1 justify-center text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleSaveAttendance('clear')}>
                    Clear Entry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
