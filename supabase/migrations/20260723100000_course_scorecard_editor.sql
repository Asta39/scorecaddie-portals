-- ============================================================
-- Club-admin scorecard editor
--
-- The scorecards seeded into the app were synthetic: stroke index was set to
-- the hole number (SI 1..18 in play order) and the yardages were admitted
-- estimates. There is no KGU dataset to replace them from — the Kenya Golf
-- Union publishes club names only — so each club supplies its own official
-- card through the club-admin portal instead.
--
-- Adds provenance columns and the RLS needed for a club admin to write the
-- Tee / CourseHole rows for their own club's course, and nobody else's.
-- ============================================================

-- ── Provenance on Course ────────────────────────────────────
alter table public."Course"
  add column if not exists "dataVerified" boolean not null default false,
  add column if not exists "dataSource" text,
  add column if not exists "verifiedAt" timestamptz,
  add column if not exists "verifiedBy" text;

comment on column public."Course"."dataVerified" is
  'True only once the scorecard has been confirmed against the official club card. Unverified courses must not be used for official handicap posting.';
comment on column public."Course"."dataSource" is
  'Provenance: official-card | scraped:<site> | estimated';

-- ── Helper: the course this admin is allowed to edit ─────────
-- SECURITY DEFINER so the policies below can read club_admins/clubs without
-- being blocked by those tables' own RLS.
create or replace function public.admin_course_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.course_id
  from public.club_admins ca
  join public.clubs c on c.id = ca.club_id
  where ca.user_id = auth.uid()
    and c.course_id is not null
  limit 1;
$$;

revoke all on function public.admin_course_id() from public;
grant execute on function public.admin_course_id() to authenticated;

-- ── Course: readable by all, editable by its own club admin ──
alter table public."Course" enable row level security;

drop policy if exists "course_read" on public."Course";
create policy "course_read" on public."Course"
  for select to authenticated
  using (true);

drop policy if exists "course_admin_update" on public."Course";
create policy "course_admin_update" on public."Course"
  for update to authenticated
  using (id = public.admin_course_id())
  with check (id = public.admin_course_id());

-- ── Tee ─────────────────────────────────────────────────────
alter table public."Tee" enable row level security;

drop policy if exists "tee_read" on public."Tee";
create policy "tee_read" on public."Tee"
  for select to authenticated
  using (true);

drop policy if exists "tee_admin_write" on public."Tee";
create policy "tee_admin_write" on public."Tee"
  for all to authenticated
  using ("courseId" = public.admin_course_id())
  with check ("courseId" = public.admin_course_id());

-- ── CourseHole ──────────────────────────────────────────────
alter table public."CourseHole" enable row level security;

drop policy if exists "coursehole_read" on public."CourseHole";
create policy "coursehole_read" on public."CourseHole"
  for select to authenticated
  using (true);

drop policy if exists "coursehole_admin_write" on public."CourseHole";
create policy "coursehole_admin_write" on public."CourseHole"
  for all to authenticated
  using ("courseId" = public.admin_course_id())
  with check ("courseId" = public.admin_course_id());

-- ── Integrity guards ────────────────────────────────────────
-- Cheap invariants enforced at the database level, so a bad card cannot be
-- written even if the UI validation is bypassed. Note these are per-row; the
-- cross-row rule (stroke indices forming a permutation of 1..N) is enforced
-- in the editor before save, since a row-level check cannot see siblings.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coursehole_hole_number_range') then
    alter table public."CourseHole"
      add constraint coursehole_hole_number_range
      check ("holeNumber" between 1 and 18);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'coursehole_par_range') then
    alter table public."CourseHole"
      add constraint coursehole_par_range
      check ("par" between 3 and 6);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'coursehole_si_range') then
    alter table public."CourseHole"
      add constraint coursehole_si_range
      check ("handicapIndex" is null or "handicapIndex" between 1 and 18);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'coursehole_distance_range') then
    alter table public."CourseHole"
      add constraint coursehole_distance_range
      check ("distance" is null or "distance" between 50 and 700);
  end if;
end $$;

-- One row per hole per tee.
create unique index if not exists uniq_coursehole_tee_hole
  on public."CourseHole"("teeId", "holeNumber")
  where "teeId" is not null;
