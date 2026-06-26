/**
 * @scorecaddie/shared — Browser-side Supabase Client
 *
 * Singleton browser client for use in Client Components only.
 * Uses the ANON KEY — subject to Row Level Security.
 *
 * ⚠️  Do NOT import this in Server Components or API routes.
 *    Use `createServerSupabaseClient()` from `./supabase-server` instead.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _browserClient: SupabaseClient | null = null

export function createBrowserSupabaseClient(): SupabaseClient {
  if (_browserClient) return _browserClient
  _browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _browserClient
}
