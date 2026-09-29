'use client'

import { Mascot } from '@/components/mascot'

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Mascot mascot="star" mood="sleep" size={88} />
      <p className="font-semibold text-foreground">This page didn&apos;t load.</p>
      <p className="max-w-sm text-sm text-muted-foreground">Check your connection, then try again.</p>
      <button type="button" className="btn-secondary mt-2" onClick={reset}>Try again</button>
    </div>
  )
}
