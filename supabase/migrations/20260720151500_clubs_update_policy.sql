-- NOT yet applied to production (blocked in-session; run via dashboard SQL editor).
--
-- The clubs table has SELECT policies only — no UPDATE policy exists. The
-- club-admin settings page updates clubs client-side (caddies_about, and now
-- brand_color): under RLS those updates match 0 rows and silently no-op while
-- the UI reports success. This scopes updates to the admin's own club.
drop policy if exists club_admins_update_own_club on public.clubs;
create policy club_admins_update_own_club on public.clubs
  for update
  using (id = (select club_id from public.club_admins where user_id = auth.uid()))
  with check (id = (select club_id from public.club_admins where user_id = auth.uid()));
