/**
 * @scorecaddie/shared
 *
 * Public API surface for the shared package.
 * Import from '@scorecaddie/shared' in portal apps.
 */

// Types and validation schemas (with Zod)
export * from './validations'

// Legacy types (kept for backward compat — prefer validations.ts inferred types)
export type {
  UserRole,
  Club,
  ClubAdmin,
  Caddie,
  CaddieAttendance,
  CaddiePayment,
  PlatformConfig,
  PlatformFlag,
  DashboardStats,
} from './types'

// Brand colors
export * from './colors'

// Supabase client factories (import individually to avoid loading Next.js internals)
// Server:  import { createServerSupabaseClient } from '@scorecaddie/shared/supabase-server'
// Admin:   import { supabaseAdmin }               from '@scorecaddie/shared/supabase-admin'
// Browser: import { createBrowserSupabaseClient } from '@scorecaddie/shared/supabase-browser'
