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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem 1rem',
      }}>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>
            Checked-In Today
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
            {caddies.length} caddies currently present at the course
          </p>
        </div>
        <Link href="/roster" style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}>
          Full Roster →
        </Link>
      </div>

      <table className="data-table" style={{ margin: 0 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={28} style={{ color: 'var(--color-light)' }} />
                  <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No caddies checked in today</p>
                  <p style={{ color: 'var(--color-light)', fontSize: '0.8rem' }}>Check in caddies from the Weekly Roster page.</p>
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
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {caddie.phone}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {caddie.experience_level}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                      <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
                      <span>{formattedTime}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10b981',
                      }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>
                        Checked In
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleCheckOut(caddie.id)}
                      disabled={loadingId === caddie.id}
                      className="btn-secondary"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderRadius: '8px',
                        cursor: loadingId === caddie.id ? 'not-allowed' : 'pointer'
                      }}
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
