import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Marks the signed-in club admin's own club_admins row as active.
 *
 * Called from /auth/confirm right after they successfully set their first
 * password. Before this, is_active starts false at creation — an invited
 * secretary who has never logged in must not show as "Active" in the
 * super-admin admins list. Uses the service-role client for the write
 * (club_admins has no UPDATE policy for authenticated users), but only after
 * verifying the caller's own session.
 *
 * Verifies via the Authorization: Bearer <access_token> header rather than
 * cookies. This route is called moments after the client just established
 * its session client-side (via setSession/updateUser on the confirm page) —
 * relying on that session having already round-tripped into a cookie the
 * server can read is a real race in practice, since @supabase/ssr's browser
 * client writes the auth cookie via document.cookie, not a server Set-Cookie
 * header. Passing the token explicitly sidesteps that entirely.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('club_admins')
      .update({ is_active: true })
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
