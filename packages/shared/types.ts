export type UserRole = 'super_admin' | 'club_admin' | 'player' | 'caddie' | 'coach'

export interface Club {
  id: string
  name: string
  location: string | null
  region: string | null
  contact_name: string | null
  contact_phone: string | null
  logo_url: string | null
  status: 'active' | 'suspended'
  onboarded_at: string
  created_at: string
  // Computed from joins
  caddie_count?: number
  active_subscriptions?: number
}

export interface ClubAdmin {
  id: string
  user_id: string
  club_id: string
  name: string | null
  email: string | null
  is_active: boolean
  created_at: string
  // Joins
  club?: Club
}

export interface Caddie {
  id: string
  user_id: string | null
  club_id: string
  name: string
  phone: string
  id_number: string | null
  experience_level: 'beginner' | 'intermediate' | 'expert'
  photo_url: string | null
  is_active: boolean
  is_marketplace_visible: boolean
  paid_until: string | null
  is_present: boolean
  registered_by_admin: boolean
  created_at: string
  updated_at: string
  // Joins
  club?: Club
}

export interface CaddieAttendance {
  id: string
  caddie_id: string
  club_id: string
  date: string
  time_in: string | null
  time_out: string | null
  is_absent: boolean
  created_at: string
  updated_at: string
  // Joins
  caddie?: Caddie
}

export interface CaddiePayment {
  id: string
  club_id: string
  paystack_reference: string
  amount_kes: number
  caddie_count: number
  caddie_ids: string[]
  status: 'pending' | 'confirmed' | 'failed'
  paid_at: string
  created_at: string
  // Joins
  club?: Club
}

export interface PlatformConfig {
  key: string
  value: string
  description: string | null
  updated_at: string
  updated_by: string | null
}

export interface PlatformFlag {
  id: string
  type: 'caddie_deactivated' | 'payment_webhook_failed' | 'club_inactive' | 'roster_all_expired' | 'payment_pending_timeout' | 'caddie_force_deactivated'
  severity: 'info' | 'warning' | 'critical'
  club_id: string | null
  caddie_id: string | null
  message: string
  metadata: Record<string, unknown> | null
  resolved: boolean
  resolved_at: string | null
  resolved_note: string | null
  created_at: string
  // Joins
  club?: Club
  caddie?: Caddie
}

// Dashboard stats shape
export interface DashboardStats {
  totalClubs: number
  totalCaddies: number
  activeSubscriptions: number
  expiredSubscriptions: number
  monthlyRecurringRevenue: number
  expiringIn7Days: number
  unresolvedFlags: number
}
