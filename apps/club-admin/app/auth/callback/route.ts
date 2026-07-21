import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase PKCE Auth Callback
 *
 * When a secretary clicks the invitation/reset email link, Supabase redirects
 * them to this route with a `code` query parameter. We exchange that code for
 * a real session (stored in cookies) and then redirect to the password-set page.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  // PKCE flow delivers `?code=`; the OTP/token_hash email template delivers
  // `?token_hash=&type=`. Support both so the link resolves regardless of how
  // the Supabase project's email template is configured.
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/auth/confirm'

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
      // Session established — redirect to the set-password page
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
    console.error('Auth callback failed to establish session:', error.message)
  }

  // If no token is present or verification failed, send to login with an error
  return NextResponse.redirect(
    new URL('/login?error=link_expired', requestUrl.origin)
  )
}
