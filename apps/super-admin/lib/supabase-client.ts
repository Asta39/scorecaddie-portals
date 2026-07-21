import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail loudly rather than silently shipping a client pointed at a fake host.
    // Pages that render this client must set `export const dynamic = 'force-dynamic'`
    // (via their layout, if the page itself is a Client Component) so this never
    // runs during static prerendering at build time.
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
