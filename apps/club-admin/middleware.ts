import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

async function runMiddleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing from environment variables!')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          } catch (_) {}
          supabaseResponse = NextResponse.next({ request })
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          } catch (_) {}
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Supabase Auth error in proxy:', error.message)
      // If refresh token is invalid or missing, we can force a clear
      // by setting user to null so they get redirected.
    } else {
      user = data?.user ?? null
    }
  } catch (err) {
    console.error('Unhandled fetch error in proxy:', err)
    user = null
  }

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
    let isClubAdmin = false
    let isActive = false

    try {
      const [profileRes, adminRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('club_admins').select('is_active').eq('user_id', user.id).single()
      ])

      isClubAdmin = profileRes.data?.role === 'club_admin'
      isActive = adminRes.data?.is_active ?? false
    } catch (err) {
      console.error('Error fetching admin profile in middleware:', err)
    }

    if (!isClubAdmin || !isActive) {
      try {
        await supabase.auth.signOut()
      } catch (_) {}
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

// The main logic is now inside the try-catch to ensure we never crash the Edge runtime.
export async function middleware(request: NextRequest) {
  try {
    return await runMiddleware(request)
  } catch (error) {
    console.error('Critical failure in middleware:', error)
    const isApi = request.nextUrl.pathname.startsWith('/api/')
    if (isApi) {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
    // Fail open to login page to avoid 500 loop
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
