/**
 * @scorecaddie/shared — Zod Validation Schemas
 *
 * Shared validation for all data shapes that flow between Supabase
 * and both portals. Using Zod means TypeScript types are *inferred*
 * from the validators — no manual type/schema sync needed.
 *
 * Usage:
 *   import { ClubSchema, type Club } from '@scorecaddie/shared/validations'
 *   const club = ClubSchema.parse(rawData)
 */

import { z } from 'zod'

// ─── Primitives ──────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum([
  'super_admin',
  'club_admin',
  'player',
  'caddie',
  'coach',
])
export type UserRole = z.infer<typeof UserRoleSchema>

// ─── Club ────────────────────────────────────────────────────────────────────

export const ClubSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  location: z.string().nullable(),
  region: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  status: z.enum(['active', 'suspended']),
  onboarded_at: z.string().datetime(),
  created_at: z.string().datetime(),
  // Computed from joins (optional)
  caddie_count: z.number().int().nonnegative().optional(),
  active_subscriptions: z.number().int().nonnegative().optional(),
})
export type Club = z.infer<typeof ClubSchema>

// ─── Club Admin ──────────────────────────────────────────────────────────────

export const ClubAdminSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  club_id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  club: ClubSchema.optional(),
})
export type ClubAdmin = z.infer<typeof ClubAdminSchema>

// ─── Caddie ──────────────────────────────────────────────────────────────────

export const CaddieExperienceSchema = z.enum([
  'beginner',
  'intermediate',
  'expert',
])
export type CaddieExperience = z.infer<typeof CaddieExperienceSchema>

export const CaddieSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  club_id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string(),
  id_number: z.string().nullable(),
  experience_level: CaddieExperienceSchema,
  photo_url: z.string().url().nullable(),
  is_active: z.boolean(),
  is_marketplace_visible: z.boolean(),
  paid_until: z.string().datetime().nullable(),
  is_present: z.boolean(),
  registered_by_admin: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  club: ClubSchema.optional(),
})
export type Caddie = z.infer<typeof CaddieSchema>

// ─── Caddie Attendance ───────────────────────────────────────────────────────

export const CaddieAttendanceSchema = z.object({
  id: z.string().uuid(),
  caddie_id: z.string().uuid(),
  club_id: z.string().uuid(),
  date: z.string().date(), // YYYY-MM-DD
  time_in: z.string().nullable(),
  time_out: z.string().nullable(),
  is_absent: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  caddie: CaddieSchema.optional(),
})
export type CaddieAttendance = z.infer<typeof CaddieAttendanceSchema>

// ─── Caddie Payment ──────────────────────────────────────────────────────────

export const CaddiePaymentSchema = z.object({
  id: z.string().uuid(),
  club_id: z.string().uuid(),
  paystack_reference: z.string(),
  amount_kes: z.number().positive(),
  caddie_count: z.number().int().positive(),
  caddie_ids: z.array(z.string().uuid()),
  status: z.enum(['pending', 'confirmed', 'failed']),
  paid_at: z.string().datetime(),
  created_at: z.string().datetime(),
  club: ClubSchema.optional(),
})
export type CaddiePayment = z.infer<typeof CaddiePaymentSchema>

// ─── Platform Config ─────────────────────────────────────────────────────────

export const PlatformConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
  updated_at: z.string().datetime(),
  updated_by: z.string().uuid().nullable(),
})
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>

// ─── Platform Flag ───────────────────────────────────────────────────────────

export const PlatformFlagTypeSchema = z.enum([
  'caddie_deactivated',
  'payment_webhook_failed',
  'club_inactive',
  'roster_all_expired',
  'payment_pending_timeout',
  'caddie_force_deactivated',
])
export type PlatformFlagType = z.infer<typeof PlatformFlagTypeSchema>

export const PlatformFlagSchema = z.object({
  id: z.string().uuid(),
  type: PlatformFlagTypeSchema,
  severity: z.enum(['info', 'warning', 'critical']),
  club_id: z.string().uuid().nullable(),
  caddie_id: z.string().uuid().nullable(),
  message: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  resolved: z.boolean(),
  resolved_at: z.string().datetime().nullable(),
  resolved_note: z.string().nullable(),
  created_at: z.string().datetime(),
  club: ClubSchema.optional(),
  caddie: CaddieSchema.optional(),
})
export type PlatformFlag = z.infer<typeof PlatformFlagSchema>

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export const DashboardStatsSchema = z.object({
  totalClubs: z.number().int().nonnegative(),
  totalCaddies: z.number().int().nonnegative(),
  activeSubscriptions: z.number().int().nonnegative(),
  expiredSubscriptions: z.number().int().nonnegative(),
  monthlyRecurringRevenue: z.number().nonnegative(),
  expiringIn7Days: z.number().int().nonnegative(),
  unresolvedFlags: z.number().int().nonnegative(),
})
export type DashboardStats = z.infer<typeof DashboardStatsSchema>

// ─── Safe parse helpers ──────────────────────────────────────────────────────

/**
 * Safely parses raw Supabase data into a typed shape.
 * Returns null and logs a warning instead of throwing on validation failure.
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.warn(
      `[ScoreCaddie] Validation failed${context ? ` (${context})` : ''}:`,
      result.error.flatten()
    )
    return null
  }
  return result.data
}
