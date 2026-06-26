/**
 * @scorecaddie/shared — Supabase Admin Client
 *
 * ⚠️  SECURITY: This client uses the SERVICE ROLE KEY which bypasses ALL
 *    Row Level Security. NEVER import this in client components or expose
 *    it to the browser. Only use in:
 *    - Server Components
 *    - API Route Handlers (route.ts)
 *    - Edge functions
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

/**
 * Returns a singleton Supabase admin client using the service role key.
 * Throws at call time if environment variables are missing (not at module
 * load time, so build-time imports don't break).
 */
export function createAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      '[ScoreCaddie] Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'These must be set in your .env.local or Vercel project settings.'
    )
  }

  _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}

// Re-export for convenience — lazy singleton pattern means this is safe
// to reference at module level (env check happens on first call)
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (createAdminClient() as any)[prop]
  },
})
