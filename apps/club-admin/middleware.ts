import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/')

  // If not logged in and not on login/auth pages → redirect to login
  if (!user && !isLoginPage && !isAuthRoute) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in, verify they are club_admin and active
  if (user && !isLoginPage) {
    const [profileRes, adminRes] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('club_admins').select('is_active').eq('user_id', user.id).single()
    ])

    const isClubAdmin = profileRes.data?.role === 'club_admin'
    const isActive = adminRes.data?.is_active ?? false

    if (!isClubAdmin || !isActive) {
      // Not an active club admin — sign them out and redirect to login
      await supabase.auth.signOut()
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }
  }

  // If logged in and on login/auth page → redirect to dashboard
  if (user && (isLoginPage || isAuthRoute)) {
    // Exception: let /auth/confirm through even when logged in (they need to set password)
    if (request.nextUrl.pathname === '/auth/confirm') {
      return supabaseResponse
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
