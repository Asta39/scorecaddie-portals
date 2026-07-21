'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = ['#0f766e', '#1f6f4a', '#1d4ed8', '#7c3aed', '#b91c1c', '#b45309', '#0e7490', '#1d1d1f']

export default function BrandColorPicker({ initialColor }: { initialColor: string }) {
  const [color, setColor] = useState(initialColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(color)

  const save = async () => {
    if (!isValidHex) {
      setError('Enter a valid hex color like #0f766e')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'platform_brand_color', value: color }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save brand color')
      return
    }
    router.refresh()
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHex ? color : '#0f766e'}
          onChange={e => setColor(e.target.value)}
          className="h-9 w-12 rounded-lg border cursor-pointer p-1 bg-card"
          style={{ borderColor: 'var(--color-ink-200)' }}
          aria-label="Brand color"
        />
        <input
          type="text"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="input w-28 text-[13px]"
          placeholder="#0f766e"
          maxLength={7}
        />
        <button onClick={save} disabled={saving || color === initialColor} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setColor(p)}
            className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
            style={{ background: p, borderColor: p === color ? 'var(--color-ink-900)' : 'transparent' }}
            aria-label={`Use ${p}`}
          />
        ))}
      </div>

      {error && <p className="text-xs" style={{ color: 'var(--color-bad)' }}>{error}</p>}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Sets the accent color across the whole super-admin portal — buttons, links, active states, and charts.
      </p>
    </div>
  )
}
