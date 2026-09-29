'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ClubMascot } from '@/components/mascot'
import { cn } from '@/lib/utils'

type Toast = { id: number; kind: 'success' | 'error'; title: string; body?: string }

let nextId = 1
const listeners = new Set<(t: Toast) => void>()

function push(kind: Toast['kind'], title: string, body?: string) {
  const t = { id: nextId++, kind, title, body }
  listeners.forEach(l => l(t))
}

/**
 * Save and error messages, told by the club's mascot: happy when something
 * saved, asleep when it didn't. Replaces the browser's alert().
 */
export const toast = {
  success: (title: string, body?: string) => push('success', title, body),
  error: (title: string, body?: string) => push('error', title, body),
}

export function MascotToaster() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    const add = (t: Toast) => {
      setItems(list => [...list.slice(-2), t])
      setTimeout(() => setItems(list => list.filter(x => x.id !== t.id)), t.kind === 'error' ? 8000 : 4000)
    }
    listeners.add(add)
    return () => { listeners.delete(add) }
  }, [])

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      {items.map(t => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex items-center gap-3 rounded-xl border bg-card p-2 pr-3 shadow-lg animate-in fade-in slide-in-from-bottom-2',
            t.kind === 'error' ? 'border-destructive/40' : 'border-emerald-500/30',
          )}
        >
          <ClubMascot mood={t.kind === 'error' ? 'sleep' : 'work'} size={44} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-foreground">{t.title}</p>
            {t.body && <p className="text-muted-foreground break-words">{t.body}</p>}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setItems(list => list.filter(x => x.id !== t.id))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
