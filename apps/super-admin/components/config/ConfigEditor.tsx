'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Edit2, X } from 'lucide-react'

interface ConfigRow { key: string; value: string; description: string | null }

export default function ConfigEditor({ config }: { config: ConfigRow[] }) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const startEdit = (row: ConfigRow) => {
    setEditingKey(row.key)
    setEditValue(row.value)
  }

  const handleSave = async (key: string) => {
    setSaving(true)
    await fetch('/api/admin/update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editValue }),
    })
    setSaving(false)
    setEditingKey(null)
    router.refresh()
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--color-lighter)' }}>
      {config.map(row => (
        <div key={row.key} className="px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold font-mono" style={{ color: 'var(--color-text)' }}>{row.key}</p>
            {row.description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-light)' }}>{row.description}</p>
            )}
          </div>

          {editingKey === row.key ? (
            <div className="flex items-center gap-2">
              <input
                className="input text-sm py-1.5 px-2.5"
                style={{ width: 160 }}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave(row.key)
                  if (e.key === 'Escape') setEditingKey(null)
                }}
                autoFocus
              />
              <button onClick={() => handleSave(row.key)} disabled={saving}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-light)' }}>
                <Check size={13} style={{ color: 'var(--color-primary)' }} />
              </button>
              <button onClick={() => setEditingKey(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-lighter)' }}>
                <X size={13} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono px-3 py-1 rounded-lg"
                style={{ background: 'var(--color-lighter)', color: 'var(--color-primary)' }}>{row.value}</span>
              <button onClick={() => startEdit(row)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-lighter)' }}>
                <Edit2 size={13} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
