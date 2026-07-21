import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase PKCE Auth Callback
 *
 * When a super-admin clicks a password recovery email, Supabase redirects them
 * here with a `code` (PKCE) or `token_hash`+`type` (OTP template) parameter. We
 * exchange it for a real session (stored in cookies), then send them to the
 * set-password page. Without this route the code/token just sits unused in the
 * URL and the visitor lands on a plain, unauthenticated /login.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/update-password'

  if (code || (tokenHash && type)) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash! })

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
    console.error('Auth callback failed to establish session:', error.message)
  }

  return NextResponse.redirect(
    new URL('/login?error=link_expired', requestUrl.origin)
  )
}
