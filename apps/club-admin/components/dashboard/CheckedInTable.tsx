'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { format, parseISO } from 'date-fns'
import { UserCheck, LogOut, Clock } from 'lucide-react'
import Link from 'next/link'

type Caddie = {
  id: string
  name: string
  phone: string
  experience_level: string
  time_in: string | null
  time_out: string | null
  paid_until: string | null
}

export function CheckedInTable({ initialCaddies, clubId }: { initialCaddies: Caddie[]; clubId: string }) {
  const supabase = createClient()
  const [caddies, setCaddies] = useState<Caddie[]>(initialCaddies)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleCheckOut = async (caddieId: string) => {
    if (loadingId) return
    setLoadingId(caddieId)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const nowIso = new Date().toISOString()

    try {
      // 1. Update the caddie_attendance table: set time_out to now()
      await supabase
        .from('caddie_attendance')
        .update({ time_out: nowIso })
        .eq('caddie_id', caddieId)
        .eq('date', todayStr)

      // 2. Update the caddie's presence to false
      await supabase
        .from('caddies')
        .update({ is_present: false })
        .eq('id', caddieId)

      // 3. Update local state to remove the caddie from the active check-in list
      setCaddies(prev => prev.filter(c => c.id !== caddieId))
    } catch (error) {
      console.error('Error checking out caddie:', error)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <h3 className="font-semibold text-foreground text-base">
            Checked-In Today
          </h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            {caddies.length} caddies currently present at the course
          </p>
        </div>
        <Link href="/roster" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
          Full Roster →
        </Link>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Caddie Name</th>
            <th>Phone</th>
            <th>Experience</th>
            <th>Check-In Time</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {caddies.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div className="flex flex-col items-center gap-2">
                  <UserCheck className="size-7 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">No caddies checked in today</p>
                  <p className="text-xs text-muted-foreground/70">Check in caddies from the Weekly Roster page.</p>
                </div>
              </td>
            </tr>
          ) : (
            caddies.map((caddie) => {
              const formattedTime = caddie.time_in 
                ? format(parseISO(caddie.time_in), 'hh:mm a') 
                : '—'

              return (
                <tr key={caddie.id}>
                  <td className="font-semibold">{caddie.name}</td>
                  <td className="font-mono text-xs text-muted-foreground">
                    {caddie.phone}
                  </td>
                  <td className="capitalize">
                    {caddie.experience_level}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span>{formattedTime}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500">
                        Checked In
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleCheckOut(caddie.id)}
                      disabled={loadingId === caddie.id}
                      className="btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1 rounded-lg"
                      style={{ cursor: loadingId === caddie.id ? 'not-allowed' : 'pointer' }}
                    >
                      <LogOut size={12} />
                      {loadingId === caddie.id ? 'Checking out...' : 'Check Out'}
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
