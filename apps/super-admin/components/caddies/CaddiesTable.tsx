'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type Caddie = {
  id: string
  name: string
  club_id: string
  phone: string
  experience_level: string
  paid_until: string | null
  is_marketplace_visible: boolean
  is_active: boolean
  photo_url: string | null
  clubs: {
    name: string
  } | null
}

interface CaddiesTableProps {
  initialCaddies: Caddie[]
}

export default function CaddiesTable({ initialCaddies }: CaddiesTableProps) {
  const [caddies, setCaddies] = useState<Caddie[]>(initialCaddies)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const now = new Date()

  const handleDeleteClick = (id: string, name: string) => {
    setDeletingId(id)
    setConfirmName(name)
    setError(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setLoading(deletingId)
    setError(null)

    try {
      const res = await fetch('/api/admin/delete-caddie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caddie_id: deletingId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete caddie')
      }

      // Filter out the deleted caddie from state
      setCaddies(prev => prev.filter(c => c.id !== deletingId))
      setDeletingId(null)
      setConfirmName(null)
    } catch (err: any) {
      console.error('Delete caddie error:', err)
      setError(err.message || 'An error occurred while deleting the caddie.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {deletingId && (
        <div className="modal-overlay" onClick={() => !loading && setDeletingId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '28rem' }}>
            <div className="flex items-start gap-4">
              <div className="bg-red-50 p-3 rounded-full text-red-600 flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Delete Caddie?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete <strong>{confirmName}</strong>? This will permanently remove them from the system, their club's records, and delete all their attendance history. This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    disabled={loading !== null}
                    className="btn-secondary py-2 text-xs"
                    onClick={() => setDeletingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading !== null}
                    className="btn-primary py-2 text-xs flex items-center gap-1.5"
                    style={{ background: '#dc2626' }}
                    onClick={handleConfirmDelete}
                  >
                    {loading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Club</th>
              <th>Phone</th>
              <th>Experience</th>
              <th>Paid Until</th>
              <th>Marketplace</th>
              <th>Status</th>
              <th className="text-right" style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {caddies.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground italic">
                  No caddies matching filters found.
                </td>
              </tr>
            ) : (
              caddies.map((c) => {
                const paid = c.paid_until && new Date(c.paid_until) > now
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                            <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{c.name.charAt(0)}</span>
                          </div>
                        )}
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {c.clubs ? (
                        <Link href={`/clubs/${c.club_id}`} className="hover:underline" style={{ color: 'var(--color-primary)' }}>
                          {c.clubs.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-sm font-mono">{c.phone}</td>
                    <td><span className="capitalize text-sm">{c.experience_level}</span></td>
                    <td className="text-sm" style={{ color: paid ? 'var(--color-secondary)' : '#7f1d1d' }}>
                      {c.paid_until ? format(new Date(c.paid_until), 'd MMM yyyy') : 'Unpaid'}
                    </td>
                    <td>
                      <span className={`badge badge-${(c.is_marketplace_visible && paid) ? 'active' : 'suspended'}`}>
                        {(c.is_marketplace_visible && paid) ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${(c.is_active && paid) ? 'active' : 'suspended'}`}>
                        {(c.is_active && paid) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right" style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <button
                        onClick={() => handleDeleteClick(c.id, c.name)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors inline-flex items-center justify-center"
                        title="Delete Caddie"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
