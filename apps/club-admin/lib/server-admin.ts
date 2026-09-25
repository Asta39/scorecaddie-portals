import { cache } from 'react'
import { createClient } from '@/lib/supabase'

// The dashboard layout and the dashboard page both need the signed-in
// admin's club. React's cache() dedupes this to one lookup per request, and
// getClaims() verifies the JWT locally instead of a round trip to the Auth
// server.
export const getServerAdmin = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null

  const { data: admin } = await supabase
    .from('club_admins')
    .select('club_id, clubs(brand_color)')
    .eq('user_id', userId)
    .single()
  if (!admin) return null

  const club = Array.isArray(admin.clubs) ? admin.clubs[0] : admin.clubs
  return {
    userId,
    clubId: admin.club_id as string,
    brandColor: (club as { brand_color?: string | null } | null)?.brand_color ?? null,
  }
})
