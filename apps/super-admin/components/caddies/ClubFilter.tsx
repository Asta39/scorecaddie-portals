'use client'

import { useRouter } from 'next/navigation'

type Club = {
  id: string
  name: string
}

export default function ClubFilter({ clubs, currentClubId }: { clubs: Club[], currentClubId: string }) {
  const router = useRouter()

  return (
    <select
      defaultValue={currentClubId}
      onChange={e => {
        const val = e.target.value
        router.push(val ? `/caddies?club=${val}` : '/caddies')
      }}
      className="input text-sm py-2 px-3"
      style={{ width: 200 }}
    >
      <option value="">All clubs</option>
      {clubs.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
