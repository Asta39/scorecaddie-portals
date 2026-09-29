import { mascotLabel, mascotSrc, type MascotMood } from '@scorecaddie/shared/mascots'
import { cn } from '@/lib/utils'

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
