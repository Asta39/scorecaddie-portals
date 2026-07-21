import { createClient } from '@supabase/supabase-js'

// IMPORTANT: This client uses the SERVICE ROLE KEY and must ONLY be used in:
// - Next.js API routes (route.ts)
// - Next.js Server Components (never passed to client)
// It bypasses ALL Row Level Security — never expose to the browser.
//
// Lazily initialized (same pattern as super-admin's lib/supabase-admin.ts):
// throwing at import time crashes `next build` page-data collection, where env
// vars are absent. The Proxy fails loudly at first use instead.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'then') return undefined // Prevent issues if runtime checks for thenable
        throw new Error('Missing Supabase environment variables for admin client')
      }
    })
