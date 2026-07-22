'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Calendar, Settings, FileDown, Search, Plus, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function TeeTimesPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'sheet' | 'settings'>('sheet')
  const [clubId, setClubId] = useState<string | null>(null)
  // course_tee_time_settings / casual_tee_time_bookings key off Course.id (text),
  // a different id space than clubs.id — must not conflate the two.
  const [courseId, setCourseId] = useState<string | null>(null)
  const [clubName, setClubName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // Settings State
  const [interval, setInterval] = useState(10)
  const [firstTime, setFirstTime] = useState('06:30:00')
  const [lastTime, setLastTime] = useState('18:00:00')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [advanceDays, setAdvanceDays] = useState(14)
  const [savingSettings, setSavingSettings] = useState(false)

  // Sheet State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    const loadClub = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('club_id, clubs(name, course_id)')
          .eq('user_id', user.id)
          .single()
        if (admin) {
          setClubId(admin.club_id)
          const club = Array.isArray(admin.clubs) ? admin.clubs[0] : admin.clubs
          setCourseId(club?.course_id ?? null)
          setClubName(club?.name ?? '')
        }
      }
      setLoading(false)
    }
    loadClub()
  }, [])

  useEffect(() => {
    if (courseId) {
      loadSettings()
    }
  }, [courseId])

  useEffect(() => {
    if (courseId && activeTab === 'sheet') {
      loadTeeSheet()
    }
  }, [courseId, activeTab, selectedDate])

  const loadSettings = async () => {
    const { data } = await supabase
      .from('course_tee_time_settings')
      .select('*')
      .eq('course_id', courseId)
      .single()

    if (data) {
      setInterval(data.tee_interval_minutes)
      setFirstTime(data.first_tee_time)
      setLastTime(data.last_tee_time)
      setMaxPlayers(data.max_players_per_slot)
      setAdvanceDays(data.advance_booking_days)
    }
  }

  const saveSettings = async () => {
    if (!courseId) return
    setSavingSettings(true)
    await supabase.from('course_tee_time_settings').upsert({
      course_id: courseId,
      tee_interval_minutes: interval,
      first_tee_time: firstTime,
      last_tee_time: lastTime,
      max_players_per_slot: maxPlayers,
      advance_booking_days: advanceDays
    })
    setSavingSettings(false)
    alert('Settings saved successfully')
  }

  const loadTeeSheet = async () => {
    if (!courseId) return
    setLoading(true)
    const { data: slots } = await supabase.rpc('get_available_tee_times', {
      p_course_id: courseId,
      p_date: selectedDate
    })

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('casual_tee_time_bookings')
      .select(`
        id, tee_time,
        casual_tee_time_players (
          user_id, custom_name,
          User (
            name, handicap:handicapIndex,
            player_club_memberships (
              club_id, status
            )
          )
        )
      `)
      .eq('course_id', courseId)
      .eq('booking_date', selectedDate)
      .neq('status', 'CANCELLED')

    if (bookingsError) console.error('Failed to load tee sheet bookings:', bookingsError)

    if (slots) setTimeSlots(slots)
    if (bookingsData) setBookings(bookingsData)

    setLoading(false)
  }

  const exportTeeSheetPdf = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(clubName || 'Tee Sheet', 14, 18)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Daily Tee Sheet — ${selectedDate}`, 14, 26)

    const rows: (string | { content: string; colSpan: number; styles: any })[][] = []

    const sortedSlots = [...timeSlots].sort((a, b) => a.time_slot.localeCompare(b.time_slot))
    for (const slot of sortedSlots) {
      const slotBookings = bookings.filter(b => b.tee_time === slot.time_slot)
      const players = slotBookings.flatMap(b => b.casual_tee_time_players)

      if (players.length === 0) continue

      rows.push([
        {
          content: `${slot.time_slot.substring(0, 5)}  (${players.length} of ${maxPlayers} booked)`,
          colSpan: 3,
          styles: { fillColor: [240, 245, 235], fontStyle: 'bold', textColor: [40, 40, 40] },
        },
      ])

      for (const p of players) {
        const name = p.custom_name || p.User?.name || 'Unknown'
        const type = p.custom_name ? 'Guest' : 'Member'
        const handicap = !p.custom_name && p.User?.handicap != null ? p.User.handicap : '—'
        rows.push([name, type, String(handicap)])
      }
    }

    if (rows.length === 0) {
      doc.setFontSize(11)
      doc.text('No bookings for this date.', 14, 38)
    } else {
      autoTable(doc, {
        startY: 34,
        head: [['Player', 'Type', 'Handicap']],
        body: rows as any,
        theme: 'grid',
        headStyles: { fillColor: [27, 122, 78] },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 2: { halign: 'center', cellWidth: 30 } },
      })
    }

    doc.save(`tee-sheet-${selectedDate}.pdf`)
  }

  const blockTimeSlot = async (timeSlot: string) => {
    if (!courseId) return
    const reason = prompt("Enter reason for blocking this time:")
    if (!reason) return

    // Create a time string for end time by adding interval
    const [hours, minutes] = timeSlot.split(':').map(Number)
    const endMinutes = minutes + interval
    const endHours = hours + Math.floor(endMinutes / 60)
    const finalEndMinutes = endMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}:00`

    await supabase.from('course_blocks').insert({
      course_id: courseId,
      block_date: selectedDate,
      start_time: timeSlot,
      end_time: endTime,
      reason: reason
    })
    loadTeeSheet()
  }

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Casual Tee Times</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage daily casual tee time bookings and limits
          </p>
        </div>
      </div>

      {!loading && !courseId ? (
        <div className="card py-10 text-center text-text-muted">
          This club isn't linked to a course yet, so casual tee times can't be managed here.
          Ask the platform admin to link a course to this club.
        </div>
      ) : (
      <>
      {/* Tabs */}
      <div className="flex border-b border-light mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'sheet'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('sheet')}
        >
          Daily Tee Sheet
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          Settings & Configuration
        </button>
      </div>

      {activeTab === 'sheet' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background border rounded-xl px-4 py-2 outline-none text-sm font-medium"
              />
            </div>
            <button className="btn-secondary" onClick={exportTeeSheetPdf}>
              <FileDown size={18} />
              Export PDF
            </button>
          </div>
          
          {loading ? (
             <div className="py-10 text-center text-text-muted">Loading Tee Sheet...</div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Availability</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, index) => {
                    const slotBookings = bookings.filter(b => b.tee_time === slot.time_slot)
                    const players = slotBookings.flatMap(b => b.casual_tee_time_players)
                    const isExpanded = expandedRow === slot.time_slot

                    return (
                      <Fragment key={index}>
                        <tr className={slot.is_blocked ? 'bg-red-50/50 cursor-pointer' : 'cursor-pointer hover:bg-gray-50'}
                            onClick={() => players.length > 0 ? setExpandedRow(isExpanded ? null : slot.time_slot) : null}>
                          <td className="font-mono font-medium">
                            <div className="flex items-center gap-2">
                              {players.length > 0 && (
                                <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                              )}
                              {slot.time_slot.substring(0, 5)}
                            </div>
                          </td>
                          <td>
                            {slot.is_blocked ? (
                              <span className="text-red-500 font-medium line-through">{maxPlayers} spots</span>
                            ) : (
                              <span className={slot.remaining_capacity === 0 ? "text-text-muted font-medium" : "text-green-600 font-medium"}>
                                {slot.remaining_capacity} of {maxPlayers} spots available
                              </span>
                            )}
                          </td>
                          <td>
                            {slot.is_blocked ? (
                              <span className="badge badge-suspended">Blocked: {slot.block_reason}</span>
                            ) : slot.remaining_capacity === 0 ? (
                              <span className="badge badge-warning">Full</span>
                            ) : (
                              <span className="badge badge-active">Open</span>
                            )}
                          </td>
                          <td>
                            {!slot.is_blocked && (
                              <button onClick={(e) => { e.stopPropagation(); blockTimeSlot(slot.time_slot); }} className="text-sm text-red-500 hover:text-red-700 font-medium">
                                Block Time
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && players.length > 0 && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={4} className="p-4 border-b border-light">
                              <div className="pl-6 space-y-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Booked Players</h4>
                                {players.map((p, idx) => {
                                  const memberships = p.User?.player_club_memberships || []
                                  const isMember = memberships.some((m: any) => m.club_id === clubId && m.status === 'active')
                                  const homeClub = memberships.length > 0 ? memberships[0].club_id : 'Unknown'

                                  return (
                                    <div key={idx} className="flex items-center gap-4 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">
                                          {p.custom_name ? p.custom_name : (p.User?.name || 'Unknown')}
                                        </p>
                                        {!p.custom_name && p.User?.handicap != null && (
                                          <p className="text-xs text-gray-500">Handicap: <span className="font-medium">{p.User.handicap}</span></p>
                                        )}
                                        {!p.custom_name && !isMember && (
                                          <p className="text-xs text-gray-500">Home Club: <span className="font-medium">{homeClub.replace('-', ' ').toUpperCase()}</span></p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {p.custom_name ? (
                                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Guest</span>
                                        ) : isMember ? (
                                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Member</span>
                                        ) : (
                                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Visitor</span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {timeSlots.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-text-muted">
                        No tee times configured. Please check settings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-6">Tee Time Configuration</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Tee Interval (Minutes)</label>
                <input 
                  type="number" 
                  value={interval} 
                  onChange={e => setInterval(Number(e.target.value))}
                  className="w-full bg-background border rounded-lg px-4 py-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Tee Time</label>
                  <input 
                    type="time" 
                    step="60"
                    value={firstTime.substring(0,5)} 
                    onChange={e => setFirstTime(e.target.value + ':00')}
                    className="w-full bg-background border rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Tee Time</label>
                  <input 
                    type="time" 
                    step="60"
                    value={lastTime.substring(0,5)} 
                    onChange={e => setLastTime(e.target.value + ':00')}
                    className="w-full bg-background border rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Players per Group</label>
                <input 
                  type="number" 
                  max={4}
                  min={1}
                  value={maxPlayers} 
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  className="w-full bg-background border rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Advance Booking Days</label>
                <input 
                  type="number" 
                  value={advanceDays} 
                  onChange={e => setAdvanceDays(Number(e.target.value))}
                  className="w-full bg-background border rounded-lg px-4 py-2"
                />
                <p className="text-xs text-text-muted mt-1">How many days in advance players can book.</p>
              </div>

              <div className="pt-4 border-t">
                <button 
                  onClick={saveSettings} 
                  disabled={savingSettings}
                  className="btn-primary w-full justify-center"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
