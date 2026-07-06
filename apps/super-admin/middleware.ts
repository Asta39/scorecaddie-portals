import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch (err) {
    console.error('Error fetching user in middleware:', err)
  }

  const isPublicPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/update-password'

  // If not logged in and not on public page → redirect to login
  if (!user && !isPublicPage) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in, verify they are super_admin
  if (user && !isPublicPage) {
    let isSuperAdmin = false
    try {
      const { data: profile } = await supabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single()

      isSuperAdmin = profile?.role === 'super_admin'
    } catch (err) {
      console.error('Error fetching super admin profile in middleware:', err)
    }

    // Only apply email guard if SUPER_ADMIN_EMAIL is set AND readable in this runtime.
    // Edge middleware may not have access to server-only env vars, so we only block
    // when the value is explicitly present AND doesn't match.
    const expectedEmail = process.env.SUPER_ADMIN_EMAIL
    const emailOk = !expectedEmail || user.email === expectedEmail

    if (!isSuperAdmin || !emailOk) {
      try {
        await supabase.auth.signOut()
      } catch (_) {}
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }
  }

  // If logged in and on login page → redirect to dashboard
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
