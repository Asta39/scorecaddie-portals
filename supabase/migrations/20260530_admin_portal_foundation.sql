-- ============================================================
-- Score Caddie Admin Portal Foundation
-- Phase 0: Run this in Supabase SQL Editor BEFORE building portals
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CLUBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  location      text,
  region        text,
  contact_name  text,
  contact_phone text,
  logo_url      text,
  status        text DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  onboarded_at  timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 2. CLUB_ADMINS TABLE (Secretary accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_admins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name       text,
  email      text,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- 3. CADDIES TABLE (Separate from User — cleaner long-term)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.caddies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link to Supabase Auth user (may be null for proxy-registered caddies with no smartphone)
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  club_id               uuid NOT NULL REFERENCES public.clubs(id),
  name                  text NOT NULL,
  phone                 text NOT NULL,
  id_number             text,
  experience_level      text DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  photo_url             text,
  -- Marketplace & subscription state
  is_active             boolean DEFAULT true,
  is_marketplace_visible boolean DEFAULT false,
  paid_until            timestamptz,
  -- Online/offline presence (driven by Club Admin roster toggles)
  is_present            boolean DEFAULT false,
  -- Flags
  registered_by_admin   boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ============================================================
-- 4. CADDIE_ATTENDANCE TABLE (Weekly timebook)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.caddie_attendance (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caddie_id  uuid NOT NULL REFERENCES public.caddies(id) ON DELETE CASCADE,
  club_id    uuid NOT NULL REFERENCES public.clubs(id),
  date       date NOT NULL,
  time_in    timestamptz,
  time_out   timestamptz,
  is_absent  boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(caddie_id, date)  -- One record per caddie per day; use UPSERT always
);

-- ============================================================
-- 5. CADDIE_PAYMENTS TABLE (Paystack batch payment records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.caddie_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             uuid NOT NULL REFERENCES public.clubs(id),
  paystack_reference  text NOT NULL UNIQUE,
  amount_kes          integer NOT NULL,
  caddie_count        integer NOT NULL,
  caddie_ids          uuid[] NOT NULL,  -- Array of caddie IDs covered by this payment
  status              text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  paid_at             timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

-- ============================================================
-- 6. PLATFORM_CONFIG TABLE (Runtime settings, no redeployment needed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_config (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

-- Seed initial platform config values
INSERT INTO public.platform_config (key, value, description) VALUES
  ('caddie_monthly_fee_kes', '280', 'Monthly subscription fee for caddies in KES'),
  ('player_monthly_fee_kes', '500', 'Monthly subscription fee for players in KES'),
  ('coach_monthly_fee_kes', '280', 'Monthly subscription fee for coaches in KES'),
  ('free_trial_days', '7', 'Free trial duration in days for all new users'),
  ('maintenance_mode', 'false', 'Set to true to take the Flutter app offline with a message'),
  ('feature_voice_logging', 'true', 'Enable Rex voice shot logging feature'),
  ('feature_ai_caddie', 'true', 'Enable Rex AI caddie persona')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. PLATFORM_FLAGS TABLE (Alerts for Super Admin review)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN (
    'caddie_deactivated',
    'payment_webhook_failed',
    'club_inactive',
    'roster_all_expired',
    'payment_pending_timeout',
    'caddie_force_deactivated'
  )),
  severity      text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  club_id       uuid REFERENCES public.clubs(id),
  caddie_id     uuid REFERENCES public.caddies(id),
  message       text NOT NULL,
  metadata      jsonb,
  resolved      boolean DEFAULT false,
  resolved_at   timestamptz,
  resolved_note text,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 8. SUPABASE PROFILES TABLE (for role-based auth in portals)
-- ============================================================
-- This table maps auth.users to their role in the platform.
-- The portals use this to gate access (super_admin vs club_admin vs player).
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'player' CHECK (role IN ('super_admin', 'club_admin', 'player', 'caddie', 'coach')),
  created_at timestamptz DEFAULT now()
);

-- Auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. TRIGGERS
-- ============================================================

-- Flag when a caddie is deactivated by club admin
CREATE OR REPLACE FUNCTION public.flag_caddie_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    INSERT INTO public.platform_flags (type, severity, club_id, caddie_id, message, metadata)
    VALUES (
      'caddie_deactivated',
      'info',
      NEW.club_id,
      NEW.id,
      'Caddie deactivated by club secretary. Review recommended.',
      jsonb_build_object('caddie_name', NEW.name, 'club_id', NEW.club_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_caddie_deactivated ON public.caddies;
CREATE TRIGGER on_caddie_deactivated
  AFTER UPDATE ON public.caddies
  FOR EACH ROW EXECUTE FUNCTION public.flag_caddie_deactivation();

-- Auto-update updated_at on caddies
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS caddies_updated_at ON public.caddies;
CREATE TRIGGER caddies_updated_at
  BEFORE UPDATE ON public.caddies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS caddie_attendance_updated_at ON public.caddie_attendance;
CREATE TRIGGER caddie_attendance_updated_at
  BEFORE UPDATE ON public.caddie_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_caddies_club_id ON public.caddies(club_id);
CREATE INDEX IF NOT EXISTS idx_caddies_paid_until ON public.caddies(paid_until);
CREATE INDEX IF NOT EXISTS idx_caddies_is_marketplace_visible ON public.caddies(is_marketplace_visible);
CREATE INDEX IF NOT EXISTS idx_caddie_attendance_caddie_date ON public.caddie_attendance(caddie_id, date);
CREATE INDEX IF NOT EXISTS idx_caddie_attendance_club_date ON public.caddie_attendance(club_id, date);
CREATE INDEX IF NOT EXISTS idx_caddie_payments_club ON public.caddie_payments(club_id);
CREATE INDEX IF NOT EXISTS idx_platform_flags_resolved ON public.platform_flags(resolved);
CREATE INDEX IF NOT EXISTS idx_club_admins_club_id ON public.club_admins(club_id);

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caddie_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caddie_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can read their own profile
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- CLUBS: club admins can read their own club; super admin reads all (via service role)
CREATE POLICY "club_admins_read_own_club" ON public.clubs
  FOR SELECT TO authenticated
  USING (
    id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- CLUB_ADMINS: can read own record
CREATE POLICY "club_admins_read_own" ON public.club_admins
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- CADDIES: club admin can read/write caddies from their club
CREATE POLICY "club_admin_read_caddies" ON public.caddies
  FOR SELECT TO authenticated
  USING (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "club_admin_write_caddies" ON public.caddies
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
  );

-- Flutter app can read marketplace-visible caddies (anon + authenticated)
CREATE POLICY "marketplace_read_active_caddies" ON public.caddies
  FOR SELECT TO anon, authenticated
  USING (
    is_marketplace_visible = true 
    AND is_active = true 
    AND (paid_until IS NULL OR paid_until > now())
  );

-- CADDIE_ATTENDANCE: scoped to club admin's club
CREATE POLICY "club_admin_attendance" ON public.caddie_attendance
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
  );

-- CADDIE_PAYMENTS: scoped to club
CREATE POLICY "club_admin_payments" ON public.caddie_payments
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM public.club_admins WHERE user_id = auth.uid())
  );

-- PLATFORM_CONFIG: anyone authenticated can read; only super admin can write (service role)
CREATE POLICY "anyone_read_config" ON public.platform_config
  FOR SELECT TO anon, authenticated
  USING (true);

-- PLATFORM_FLAGS: only super admin reads/writes (via service role in API routes)
-- Service role bypasses RLS entirely, so no policy needed for server-side ops.
-- Add a safety read policy for super admin session:
CREATE POLICY "super_admin_flags" ON public.platform_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 12. SUPABASE STORAGE BUCKETS
-- ============================================================
-- Run these separately in the Supabase Storage UI or via the API:
-- 
-- Bucket 1: caddie-photos (public)
--   Folder: /{club_id}/{caddie_id}.jpg
--
-- Bucket 2: club-assets (public)
--   Folder: /{club_id}/logo.jpg
--
-- Storage policies (run in SQL Editor):

INSERT INTO storage.buckets (id, name, public)
VALUES ('caddie-photos', 'caddie-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('club-assets', 'club-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Club admins can upload to their club's folder in caddie-photos
CREATE POLICY "club_admin_upload_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'caddie-photos'
    AND (storage.foldername(name))[1] = (
      SELECT club_id::text FROM public.club_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "public_read_photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('caddie-photos', 'club-assets'));

-- ============================================================
-- 13. ENABLE REALTIME
-- ============================================================
-- Run in Supabase Dashboard: Database → Replication → enable for:
-- caddie_attendance, caddies, platform_flags

-- ============================================================
-- 14. GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caddies TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caddie_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caddie_payments TO authenticated;
GRANT SELECT ON public.platform_config TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated;

SELECT 'Score Caddie Admin Portal Foundation — schema applied successfully!' AS status;
