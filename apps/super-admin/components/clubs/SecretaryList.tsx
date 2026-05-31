'use client'

import { useState } from 'react'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Secretary = {
  id: string
  user_id: string
  club_id: string
  name: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

export default function SecretaryList({ admins }: { admins: Secretary[] | null }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<Secretary | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDelete = async (admin: Secretary) => {
    setConfirmDeleteUser(null)
    setDeletingId(admin.id)
    setError('')

    try {
      const res = await fetch('/api/admin/delete-club-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: admin.user_id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to delete secretary account')
      }

      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred while deleting.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!admins || admins.length === 0) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-sm" style={{ color: 'var(--color-light)' }}>No secretary accounts yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--color-lighter)' }}>
      {error && (
        <div className="m-4 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-start gap-1.5">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {admins.map((a) => (
        <div key={a.id} className="px-5 py-3.5 flex items-center justify-between group">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{a.name ?? a.email}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-light)' }}>{a.email}</p>
            <span className={`badge mt-1.5 badge-${a.is_active ? 'active' : 'suspended'} text-xs`}>
              {a.is_active ? 'Active' : 'Deactivated'}
            </span>
          </div>

          <button
            onClick={() => setConfirmDeleteUser(a)}
            disabled={deletingId === a.id}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
            title="Delete Secretary Account"
          >
            {deletingId === a.id ? (
              <Loader2 size={16} className="animate-spin text-red-600" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      ))}

      {/* Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteUser(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center p-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Delete Secretary?</h3>
              <p className="text-sm px-2 mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Are you sure you want to delete the account for <strong>{confirmDeleteUser.name || confirmDeleteUser.email}</strong>? This will permanently revoke their access to the Club Admin portal.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteUser(null)}
                  className="btn-secondary flex-1 justify-center py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteUser)}
                  className="btn-primary flex-1 justify-center py-2 text-sm font-semibold"
                  style={{ background: '#dc2626' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
