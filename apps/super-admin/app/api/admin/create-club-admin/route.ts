import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Must point at the club-admin portal's real, stable production domain — never a
// per-deployment Vercel preview URL (those regenerate on every deploy and expire).
// Set CLUB_ADMIN_URL in this project's Vercel environment variables.
function getClubAdminUrl(): string {
  const url = process.env.CLUB_ADMIN_URL
  if (url) return url
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3001'
  throw new Error('CLUB_ADMIN_URL environment variable is not configured')
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, club_id } = await req.json()

    if (!name?.trim() || !email?.trim() || !club_id) {
      return NextResponse.json({ error: 'Name, email, and club are required' }, { status: 400 })
    }

    let clubAdminUrl: string
    try {
      clubAdminUrl = getClubAdminUrl()
    } catch (e: any) {
      console.error(e)
      return NextResponse.json({ error: 'Server is misconfigured: CLUB_ADMIN_URL is not set' }, { status: 500 })
    }

    // Verify the club actually exists before creating an Auth user around it.
    const { data: club, error: clubLookupError } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('id', club_id)
      .single()

    if (clubLookupError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 400 })
    }

    // 1. Create the Supabase Auth user (with a random password, so it doesn't try to send a welcome email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: Math.random().toString(36).slice(-10) + 'A1!',
      email_confirm: true, // Skip email confirmation, we'll send a recovery link instead
      user_metadata: { name, role: 'club_admin' },
    })

    if (authError) {
      console.error('Create auth user error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData.user.id

    // 2. Set role in User table. The live "User" table requires email, name,
    //    and updatedAt (NOT NULL, no defaults) — upserting only {id, role}
    //    fails, and a missing/wrong-role User row means the club-admin
    //    middleware rejects the account forever. So this must succeed, and a
    //    failure must roll back the auth user instead of leaving a dead invite.
    const { error: profileError } = await supabaseAdmin
      .from('User')
      .upsert({
        id: userId,
        email: email.trim(),
        name: name.trim(),
        role: 'club_admin',
        updatedAt: new Date().toISOString(),
      })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Failed to set up the account profile: ${profileError.message}` }, { status: 500 })
    }

    // 3. Insert club_admins row linking user to club
    const { error: adminError } = await supabaseAdmin
      .from('club_admins')
      .insert({ user_id: userId, club_id, name: name.trim(), email: email.trim() })

    if (adminError) {
      console.error('Club admin insert error:', adminError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: adminError.message }, { status: 500 })
    }

    // 4. Generate ONE password-setup link pointing to /auth/callback.
    //    IMPORTANT: use a single token. Calling generateLink AND
    //    resetPasswordForEmail issues two recovery tokens, and the second
    //    silently invalidates the first — which is what made the copyable
    //    link land on an "expired" error. generateLink returns the action_link
    //    directly and does not depend on transactional email delivery working.
    //    /auth/callback exchanges the link's code for a session, then sends the
    //    secretary to /auth/confirm to set their password.
    let actionLink = ''
    let linkError = ''
    try {
      const { data: linkData, error: genError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim(),
        options: {
          redirectTo: `${clubAdminUrl}/auth/callback`,
        },
      })
      if (genError) {
        linkError = genError.message
        console.error('Failed to generate password setup link:', genError)
      } else if (linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link
      }
    } catch (e: any) {
      linkError = e?.message || String(e)
      console.error('Failed to generate password setup link:', e)
    }

    return NextResponse.json({
      success: true,
      userId,
      message: actionLink
        ? `Account created for ${email}. Share the password setup link below with the secretary.`
        : `Account created for ${email}, but the setup link could not be generated${linkError ? `: ${linkError}` : ''}. You can resend it from the club page.`,
      actionLink, // The single, valid link the super-admin copies & sends
    })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
