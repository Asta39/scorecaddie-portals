import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Updates the signed-in club admin's own club branding.
 * Uses the service-role client for the write (clubs has no UPDATE policy for
 * authenticated users), but only after verifying the session user administers
 * the club being updated.
 */
export async function POST(req: NextRequest) {
  try {
    const { brand_color } = await req.json()

    if (typeof brand_color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(brand_color)) {
      return NextResponse.json({ error: 'brand_color must be a hex color like #0f766e' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: admin } = await supabaseAdmin
      .from('club_admins')
      .select('club_id, is_active')
      .eq('user_id', user.id)
      .single()

    if (!admin?.club_id || admin.is_active === false) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('clubs')
      .update({ brand_color })
      .eq('id', admin.club_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
