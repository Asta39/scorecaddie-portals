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
    <div className="divide-y border-t border-border">
      {config.map(row => (
        <div key={row.key} className="px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold font-mono text-foreground">{row.key}</p>
            {row.description && (
              <p className="text-xs mt-0.5 text-muted-foreground">{row.description}</p>
            )}
          </div>

          {editingKey === row.key ? (
            <div className="flex items-center gap-2">
              <input
                className="input text-sm py-1.5 px-2.5 bg-background text-foreground border-border"
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
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary hover:bg-primary/95 text-primary-foreground">
                <Check size={13} />
              </button>
              <button onClick={() => setEditingKey(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono px-3 py-1 rounded-lg bg-muted text-foreground font-medium">{row.value}</span>
              <button onClick={() => startEdit(row)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground">
                <Edit2 size={13} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
