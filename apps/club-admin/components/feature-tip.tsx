'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ClubMascot } from '@/components/mascot'

/**
 * A one-time note from the club's mascot the first time an admin opens a new
 * feature. Dismissing it hides it for good on this browser.
 */
export function FeatureTip({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const key = `tip-dismissed:${id}`
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      setShow(localStorage.getItem(key) !== '1')
    } catch {
      setShow(true)
    }
  }, [key])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Private window: it will show again next visit, which is fine.
    }
  }

  return (
    <div className="mb-6 flex items-start gap-3">
      <ClubMascot size={56} />
      <div className="card flex-1 p-4 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
        <button type="button" onClick={dismiss} className="btn-primary mt-3 text-xs">Got it</button>
      </div>
    </div>
  )
}
