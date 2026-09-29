'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { mascotLabel, mascotSrc, type MascotMood } from '@scorecaddie/shared/mascots'
import { cn } from '@/lib/utils'

const ClubMascotContext = createContext<string | null>(null)

/** Makes the signed-in club's mascot available to every dashboard screen. */
export function ClubMascotProvider({ mascot, children }: { mascot: string | null; children: ReactNode }) {
  return <ClubMascotContext.Provider value={mascot}>{children}</ClubMascotContext.Provider>
}

export function useClubMascot() {
  return useContext(ClubMascotContext)
}

export function Mascot({
  mascot,
  mood = 'idle',
  size = 64,
  hop = false,
  className,
}: {
  mascot: string | null | undefined
  mood?: MascotMood
  size?: number
  hop?: boolean
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mascotSrc(mascot, mood)}
      alt={`${mascotLabel(mascot)} mascot`}
      width={size}
      height={size}
      className={cn('shrink-0 select-none', hop && 'mascot-hop', className)}
      draggable={false}
    />
  )
}

/** The signed-in club's own mascot. */
export function ClubMascot(props: Omit<Parameters<typeof Mascot>[0], 'mascot'>) {
  return <Mascot mascot={useClubMascot()} {...props} />
}

/**
 * A centred mascot with a title, a line of help and an optional action:
 * for empty lists, failed loads and finished jobs.
 */
export function MascotState({
  mood = 'sleep',
  title,
  children,
  action,
  size = 88,
  className,
}: {
  mood?: MascotMood
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  size?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <ClubMascot mood={mood} size={size} hop={mood === 'work'} />
      <p className="font-semibold text-foreground">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
