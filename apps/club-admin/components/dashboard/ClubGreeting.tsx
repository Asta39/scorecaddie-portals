import { ClubMascot } from '@/components/mascot'

/** One line on how the club's day looks, told by the club's mascot. */
export function ClubGreeting({
  clubName,
  teeTimesToday,
  firstTeeTime,
  presentCaddies,
}: {
  clubName: string | null
  teeTimesToday: number
  firstTeeTime: string | null
  presentCaddies: number
}) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Nairobi' }).format(new Date()))
  const part = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const busy = teeTimesToday > 0 || presentCaddies > 0
  const name = clubName?.replace(/\s+(golf|country)\s+club$/i, '').trim() || 'there'

  const detail = teeTimesToday > 0
    ? `${teeTimesToday} tee time${teeTimesToday === 1 ? '' : 's'} booked today${firstTeeTime ? `, first at ${firstTeeTime.slice(0, 5)}` : ''}. ${presentCaddies} caddie${presentCaddies === 1 ? '' : 's'} on the course.`
    : presentCaddies > 0
      ? `No tee times booked yet today. ${presentCaddies} caddie${presentCaddies === 1 ? '' : 's'} checked in.`
      : 'A quiet day so far. No tee times booked and no caddies checked in.'

  return (
    <div className="card flex items-center gap-4 p-4">
      <ClubMascot mood={busy ? 'work' : 'sleep'} size={72} hop={busy} />
      <div className="min-w-0">
        <p className="text-base font-semibold text-foreground">{part}, {name}.</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
