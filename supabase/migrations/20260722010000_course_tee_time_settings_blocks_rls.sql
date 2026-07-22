-- course_tee_time_settings and course_blocks had RLS enabled with zero
-- policies — every select/insert/update/delete was silently denied. This is
-- why club-admin settings never saved, block-time-slot never persisted, and
-- get_available_tee_times (not SECURITY DEFINER) could never see settings
-- or blocks either.

alter table public.course_tee_time_settings enable row level security;
alter table public.course_blocks enable row level security;

drop policy if exists "tee_time_settings_read" on public.course_tee_time_settings;
create policy "tee_time_settings_read" on public.course_tee_time_settings
  for select to authenticated
  using (true);

drop policy if exists "tee_time_settings_admin_write" on public.course_tee_time_settings;
create policy "tee_time_settings_admin_write" on public.course_tee_time_settings
  for all to authenticated
  using (
    course_id in (
      select c.course_id from public.club_admins ca
      join public.clubs c on c.id = ca.club_id
      where ca.user_id = auth.uid() and c.course_id is not null
    )
  )
  with check (
    course_id in (
      select c.course_id from public.club_admins ca
      join public.clubs c on c.id = ca.club_id
      where ca.user_id = auth.uid() and c.course_id is not null
    )
  );

drop policy if exists "course_blocks_read" on public.course_blocks;
create policy "course_blocks_read" on public.course_blocks
  for select to authenticated
  using (true);

drop policy if exists "course_blocks_admin_write" on public.course_blocks;
create policy "course_blocks_admin_write" on public.course_blocks
  for all to authenticated
  using (
    course_id in (
      select c.course_id from public.club_admins ca
      join public.clubs c on c.id = ca.club_id
      where ca.user_id = auth.uid() and c.course_id is not null
    )
  )
  with check (
    course_id in (
      select c.course_id from public.club_admins ca
      join public.clubs c on c.id = ca.club_id
      where ca.user_id = auth.uid() and c.course_id is not null
    )
  );
