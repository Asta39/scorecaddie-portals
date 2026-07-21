-- Applied to production 2026-07-20 (project qqvzklonfybticckpuvx) via MCP.
--
-- The live club_posts table (created out-of-band; it matches neither this
-- repo's 20260614 migration nor scorecaddie-app's 20260628 one) carried
-- wide-open write policies: any authenticated user could insert, update, or
-- delete any club's posts. Scoped policies (club_posts_insert,
-- club_posts_view) already existed alongside them, but permissive policies OR
-- together, so the open ones won.
--
-- This drops the open write policies and adds club_admins-scoped update and
-- delete, matching the existing club_posts_insert pattern. The public SELECT
-- policy ("Public can view club posts") is intentionally left in place —
-- posts are club announcements.
drop policy if exists "Authenticated users can create posts" on public.club_posts;
drop policy if exists "Authenticated users can update posts" on public.club_posts;
drop policy if exists "Authenticated users can delete posts" on public.club_posts;

drop policy if exists club_posts_update on public.club_posts;
create policy club_posts_update on public.club_posts
  for update
  using (exists (
    select 1 from public.club_admins ca
    where ca.club_id = club_posts.club_id and ca.user_id = auth.uid()
  ));

drop policy if exists club_posts_delete on public.club_posts;
create policy club_posts_delete on public.club_posts
  for delete
  using (exists (
    select 1 from public.club_admins ca
    where ca.club_id = club_posts.club_id and ca.user_id = auth.uid()
  ));

-- Link clubs to their Course row (Course.id is text). The super-admin
-- create-club flow persists this and the club-admin casual tee-sheet reads it;
-- the column had never been created in production.
alter table public.clubs add column if not exists course_id text;
