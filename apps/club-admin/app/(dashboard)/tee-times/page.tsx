'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Calendar, Settings, FileDown, Search, Plus, Trash2 } from 'lucide-react'

export default function TeeTimesPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'sheet' | 'settings'>('sheet')
  const [clubId, setClubId] = useState<string | null>(null)
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

  useEffect(() => {
    if (clubId) {
      loadSettings()
    }
  }, [clubId])

  useEffect(() => {
    if (clubId && activeTab === 'sheet') {
      loadTeeSheet()
    }
  }, [clubId, activeTab, selectedDate])

  const loadSettings = async () => {
    const { data } = await supabase
      .from('course_tee_time_settings')
      .select('*')
      .eq('course_id', clubId)
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
    setSavingSettings(true)
    await supabase.from('course_tee_time_settings').upsert({
      course_id: clubId,
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
    setLoading(true)
    const { data: slots } = await supabase.rpc('get_available_tee_times', {
      p_course_id: clubId,
      p_date: selectedDate
    })
    
    const { data: bookingsData } = await supabase
      .from('casual_tee_time_bookings')
      .select(`
        id, tee_time,
        casual_tee_time_players (
          player_id, guest_name, status,
          User (
            name,
            player_club_memberships (
              club_id, status
            )
          )
        )
      `)
      .eq('course_id', clubId)
      .eq('booking_date', selectedDate)
      .neq('status', 'CANCELLED')
      
    if (slots) setTimeSlots(slots)
    if (bookingsData) setBookings(bookingsData)
    
    setLoading(false)
  }

  const blockTimeSlot = async (timeSlot: string) => {
    const reason = prompt("Enter reason for blocking this time:")
    if (!reason) return
    
    // Create a time string for end time by adding interval
    const [hours, minutes] = timeSlot.split(':').map(Number)
    const endMinutes = minutes + interval
    const endHours = hours + Math.floor(endMinutes / 60)
    const finalEndMinutes = endMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}:00`

    await supabase.from('course_blocks').insert({
      course_id: clubId,
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
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background border rounded-xl px-4 py-2 outline-none text-sm font-medium"
              />
            </div>
            <button className="btn-secondary" onClick={() => window.print()}>
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
                                          {p.guest_name ? p.guest_name : (p.User?.name || 'Unknown')}
                                        </p>
                                        {!p.guest_name && !isMember && (
                                          <p className="text-xs text-gray-500">Home Club: <span className="font-medium">{homeClub.replace('-', ' ').toUpperCase()}</span></p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {p.guest_name ? (
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
          <div className="card">
            <h3 className="text-lg font-bold mb-6">Tee Time Configuration</h3>
            
            <div className="space-y-5">
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
    </div>
  )
}
