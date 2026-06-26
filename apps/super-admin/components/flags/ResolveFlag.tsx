'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function ResolveFlag({ flagId }: { flagId: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleResolve = async () => {
    setLoading(true)
    await fetch('/api/admin/resolve-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_id: flagId, note }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
        style={{ background: 'var(--color-lighter)', color: 'var(--color-primary)' }}>
        <CheckCircle size={13} />
        Resolve
      </button>
    )
  }

  return (
    <div className="flex-shrink-0 flex flex-col gap-2" style={{ minWidth: 220 }}>
      <textarea
        className="input text-xs resize-none"
        rows={2}
        placeholder="Resolution note (optional)…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-secondary text-xs py-1.5 flex-1 justify-center">Cancel</button>
        <button onClick={handleResolve} disabled={loading} className="btn-primary text-xs py-1.5 flex-1 justify-center">
          {loading ? '…' : 'Mark Resolved'}
        </button>
      </div>
    </div>
  )
}
