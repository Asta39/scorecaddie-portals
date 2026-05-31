import { createServerClient } from '@supabase/ssr'
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
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/auth/confirm'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Code exchanged successfully — redirect to the set-password page
      return NextResponse.redirect(new URL('/auth/confirm', requestUrl.origin))
    }
  }

  // If code is missing or exchange failed, send to login with an error
  return NextResponse.redirect(
    new URL('/login?error=link_expired', requestUrl.origin)
  )
}
