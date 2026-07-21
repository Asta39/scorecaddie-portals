'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddSecretaryButton({ clubId, clubName }: { clubId: string, clubName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ message: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({ name: '', email: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(null)

    const res = await fetch('/api/admin/create-club-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, club_id: clubId }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create account')
      setLoading(false)
      return
    }

    setSuccess({ message: data.message, link: data.actionLink ?? '' })
    setLoading(false)
  }

  const handleClose = () => {
    setOpen(false)
    setSuccess(null)
    setForm({ name: '', email: '' })
    setCopied(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => setOpen(true)}>
        <Plus size={13} />
        Add Secretary
      </button>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Add Secretary Account</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>For {clubName}</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-lighter)' }}>
                <X size={16} style={{ color: 'var(--color-primary)' }} />
              </button>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="text-sm bg-green-50 p-4 rounded-lg border border-green-200 text-green-700 text-center font-medium">
                  ✓ {success.message}
                </div>

                {success.link && (
                  <div className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--color-light)' }}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Password Setup Link
                    </label>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Copy and send this link to the secretary. They open it to set their password and activate their account.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={success.link}
                        className="input text-xs py-1.5 flex-1 select-all"
                        onClick={e => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        className="btn-secondary text-xs px-3 py-1.5 min-w-[70px] justify-center"
                        onClick={() => {
                          navigator.clipboard.writeText(success.link)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t" style={{ borderColor: 'var(--color-lighter)' }}>
                  <button type="button" onClick={handleClose} className="w-full btn-primary justify-center py-2.5 text-sm font-semibold">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                    Secretary Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input className="input" placeholder="Full name" required
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input className="input" type="email" placeholder="secretary@club.co.ke" required
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>

                <div className="text-xs p-3 rounded-lg" style={{ background: 'var(--color-lighter)', color: 'var(--color-text-muted)' }}>
                  A password setup link will be emailed to this address. The secretary will set their own password before logging in.
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                    {loading ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
