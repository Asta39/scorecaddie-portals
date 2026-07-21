'use client'

import { useState } from 'react'
import { Edit2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Club {
  id: string
  name: string
  location: string | null
  region: string | null
  status: string
  course_id: string | null
}

interface Course {
  id: string
  name: string
}

export default function EditClubButton({ club, courses = [] }: { club: Club; courses?: Course[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    name: club.name,
    location: club.location ?? '',
    region: club.region ?? '',
    status: club.status,
    course_id: club.course_id ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/update-club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: club.id, ...form }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to update club')
      setLoading(false)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5" onClick={() => setOpen(true)}>
        <Edit2 size={13} />
        Edit Details
      </button>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Edit Club</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Update golf club details</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-lighter)' }}>
                <X size={16} style={{ color: 'var(--color-primary)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Club Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input className="input" placeholder="e.g. Karen Country Club" required
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Location</label>
                  <input className="input" placeholder="e.g. Karen, Nairobi"
                    value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Region</label>
                  <input className="input" placeholder="e.g. Nairobi"
                    value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Linked Course</label>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Required for casual tee-time management in the club portal.
                </p>
                <select className="input" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                  <option value="">— Not linked —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
