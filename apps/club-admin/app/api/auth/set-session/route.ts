import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Establishes a session from tokens the client extracted from an auth
 * redirect (implicit-flow fragment, PKCE code, or OTP token_hash) and
 * writes it as real cookies via a genuine Set-Cookie response header.
 *
 * This must run server-side. Calling supabase.auth.setSession() /
 * exchangeCodeForSession() / verifyOtp() directly on the *browser* client
 * writes the session via document.cookie, not an HTTP response — and in
 * practice those cookies were not reliably visible to the server on the
 * very next request (confirmed via Vercel runtime logs: middleware logged
 * "Auth session missing!" 71 times across 3 users). Doing it here instead
 * means middleware and every other server-side read sees a properly-issued
 * cookie from the start.
 */
export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token, code, token_hash, type } = await req.json()

    const response = NextResponse.json({ success: true })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    let error
    if (access_token && refresh_token) {
      ({ error } = await supabase.auth.setSession({ access_token, refresh_token }))
    } else if (code) {
      ({ error } = await supabase.auth.exchangeCodeForSession(code))
    } else if (token_hash && type) {
      ({ error } = await supabase.auth.verifyOtp({ token_hash, type }))
    } else {
      return NextResponse.json({ error: 'No auth token provided' }, { status: 400 })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
