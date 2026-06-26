/**
 * @scorecaddie/shared — Server-side Supabase client factory
 *
 * Creates a cookie-based server client for use in:
 * - Next.js Server Components
 * - Next.js API Route Handlers (route.ts)
 * - Next.js Middleware (use the middleware variant below)
 *
 * ⚠️  This uses the ANON KEY. For admin operations that bypass RLS,
 *     use `createAdminClient()` from `./supabase-admin`.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can throw in Server Components — safe to ignore
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for use inside Next.js Middleware.
 * Middleware cannot use `next/headers` directly, so we pass the
 * Request/Response objects instead.
 */
export function createMiddlewareSupabaseClient(
  request: Request,
  response: Response
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return (request as any).cookies?.getAll?.() ?? []
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => {
            try { (request as any).cookies?.set(name, value) } catch {}
          })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
            try { (response as any).cookies?.set(name, value, options) } catch {}
          })
        },
      },
    }
  )
}
