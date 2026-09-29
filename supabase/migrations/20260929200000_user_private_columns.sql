-- Keep golfers' private details private.
--
-- "Profiles are viewable by everyone" lets any signed-in user read every
-- column of every User row, emails included. Row-level security can't hide
-- a column, so this swaps the table-wide SELECT grant for a column list that
-- leaves out the private columns. Everything else stays readable, so names,
-- avatars, handicaps and coach listings keep working.
--
-- Whole public profiles come from the UserPublic view; golfers read their
-- own full row through public.my_profile(). The service
-- role (portal API routes, edge functions) is unaffected.
--
-- Private: email, firebaseUid, currentBookingId, and any token or secret.

revoke select on public."User" from anon, authenticated;

do $$
declare
  cols text;
begin
  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'User'
    and column_name not in ('email', 'firebaseUid', 'currentBookingId')
    and column_name !~* '(token|secret|password)';

  execute format('grant select (%s) on public."User" to authenticated', cols);

  -- Every public column of every golfer, for screens that show a whole
  -- profile (coach listings, player pages). Built from the same list so a
  -- new private column only needs adding above.
  execute 'drop view if exists public."UserPublic"';
  execute format('create view public."UserPublic" as select %s from public."User"', cols);
end;
$$;

revoke all on public."UserPublic" from public, anon;
grant select on public."UserPublic" to authenticated;

-- The signed-in golfer's own row, every column. Also finds a row made under
-- an older sign-in with the same verified email, which the app used to look
-- up directly by email.
create or replace function public.my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(u)
  from public."User" u
  where u.id = (select auth.uid())::text
     or (u.email is not null and u.email = (select auth.jwt() ->> 'email'))
  order by (u.id = (select auth.uid())::text) desc
  limit 1
$$;

revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- Club admins see the email of each member of their own club (the portal's
-- members page lists it). Columns are compared as text because these
-- tables were created outside the migrations.
create or replace function public.club_member_emails(p_club_id text)
returns table (player_id text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.player_id::text, u.email
  from public.player_club_memberships m
  join public."User" u on u.id = m.player_id::text
  where m.club_id::text = p_club_id
    and exists (
      select 1 from public.club_admins a
      where a.club_id::text = p_club_id and a.user_id::text = (select auth.uid())::text
    )
$$;

revoke all on function public.club_member_emails(text) from public, anon;
grant execute on function public.club_member_emails(text) to authenticated;
