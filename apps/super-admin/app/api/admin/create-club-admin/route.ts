import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// The club-admin portal URL — update for production
const CLUB_ADMIN_URL = process.env.CLUB_ADMIN_URL ?? 
  process.env.NEXT_PUBLIC_CLUB_ADMIN_URL ?? 
  (process.env.NODE_ENV === 'production' 
    ? 'https://club-admin-kappa.vercel.app' 
    : 'http://localhost:3001')

export async function POST(req: NextRequest) {
  try {
    const { name, email, club_id } = await req.json()

    if (!name?.trim() || !email?.trim() || !club_id) {
      return NextResponse.json({ error: 'Name, email, and club are required' }, { status: 400 })
    }

    // 1. Create the Supabase Auth user (no password — they'll set one via the link)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      email_confirm: true, // Skip email confirmation, we'll send a recovery link instead
      user_metadata: { name, role: 'club_admin' },
    })

    if (authError) {
      console.error('Create auth user error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData.user.id

    // 2. Set role in User table
    const { error: profileError } = await supabaseAdmin
      .from('User')
      .upsert({ id: userId, role: 'club_admin' })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      // Don't fail — the trigger may have already created a row
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

    // 4. Send a password-setup link pointing to /auth/callback
    //    Supabase appends the PKCE `code` param to this URL.
    //    /auth/callback exchanges it for a session, then redirects to /auth/confirm.
    let actionLink = ''
    try {
      // First, generate the link so we have it in the UI as a fallback
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim(),
        options: {
          redirectTo: `${CLUB_ADMIN_URL}/auth/callback`,
        },
      })
      if (linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link
      }

      // Second, actually SEND the email via Supabase
      await supabaseAdmin.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${CLUB_ADMIN_URL}/auth/callback`,
      })
    } catch (e) {
      console.error('Failed to generate/send link:', e)
    }

    return NextResponse.json({
      success: true,
      userId,
      message: `Account created. A password setup email has been sent to ${email}.`,
      actionLink, // Super-admin can copy & share this if the email doesn't arrive
    })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
