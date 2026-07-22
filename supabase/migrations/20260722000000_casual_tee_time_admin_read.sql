-- Club admins could never see casual tee time bookings for their own course:
-- the only SELECT policy required auth.uid() = player_id (the booker), so
-- the club-admin tee sheet always queried zero rows regardless of the
-- column-name bug fixed alongside this. Add read access for the admin whose
-- club is linked to the booking's course.

drop policy if exists "Club admins can view course bookings" on public.casual_tee_time_bookings;
create policy "Club admins can view course bookings" on public.casual_tee_time_bookings
  for select to authenticated
  using (
    course_id in (
      select c.course_id from public.club_admins ca
      join public.clubs c on c.id = ca.club_id
      where ca.user_id = auth.uid() and c.course_id is not null
    )
  );

drop policy if exists "Club admins can view course booking players" on public.casual_tee_time_players;
create policy "Club admins can view course booking players" on public.casual_tee_time_players
  for select to authenticated
  using (
    booking_id in (
      select b.id from public.casual_tee_time_bookings b
      join public.clubs c on c.course_id = b.course_id
      join public.club_admins ca on ca.club_id = c.id
      where ca.user_id = auth.uid()
    )
  );
