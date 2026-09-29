'use client'

import { MascotState } from '@/components/mascot'

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card">
      <MascotState
        title="This page didn't load."
        action={<button type="button" className="btn-secondary" onClick={reset}>Try again</button>}
      >
        Check your connection, then try again. If it keeps happening, contact support from Help &amp; Support.
      </MascotState>
    </div>
  )
}
