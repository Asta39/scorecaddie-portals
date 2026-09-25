import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheAccess, forgetAccess, isAccessCached } from '@/lib/access-cache'

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

  // getClaims() verifies the JWT locally against the project's cached
  // signing keys (ES256), instead of getUser()'s round trip to the Auth
  // server on every request. It still refreshes an expiring session.
  let user: { id: string } | null = null
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (error) {
      console.error('Supabase Auth error in proxy:', error.message)
    } else if (data?.claims?.sub) {
      user = { id: data.claims.sub }
    }
  } catch (err) {
    console.error('Unhandled fetch error in proxy:', err)
    user = null
  }

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/')

  // Activation routes (/auth/callback exchanges the invite code, /auth/confirm
  // sets the first password) must ALWAYS pass through untouched. A freshly
  // invited secretary is mid-provisioning and may not yet have a fully set-up
  // role/club_admins row, so running the authorization gate here would sign
  // them out and bounce them to /login before they can set a password.
  if (isAuthRoute) {
    return supabaseResponse
  }

  // If not logged in and not on the login page → redirect to login
  if (!user && !isLoginPage) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in, verify they are club_admin and active
  if (user && !isLoginPage && !isAccessCached(user.id)) {
    let isClubAdmin = false
    let isActive = false

    try {
      const [profileRes, adminRes] = await Promise.all([
        supabase.from('User').select('role').eq('id', user.id).single(),
        supabase.from('club_admins').select('is_active').eq('user_id', user.id).single()
      ])

      isClubAdmin = profileRes.data?.role === 'club_admin'
      isActive = adminRes.data?.is_active ?? false
    } catch (err) {
      console.error('Error fetching admin profile in middleware:', err)
    }

    if (isClubAdmin && isActive) {
      cacheAccess(user.id)
    } else {
      forgetAccess(user.id)
      try {
        await supabase.auth.signOut()
      } catch (_) {}
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }
  }

  // If logged in and on the login page → redirect to dashboard
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

// The main logic is now inside the try-catch to ensure we never crash the Edge runtime.
export async function proxy(request: NextRequest) {
  try {
    return await runMiddleware(request)
  } catch (error) {
    console.error('Critical failure in proxy:', error)
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
