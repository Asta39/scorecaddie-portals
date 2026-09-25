-- ============================================================================
-- Performance pass (2026-09-26)
--
-- 1. Indexes for the portals' and app's hot filters and joins.
-- 2. RLS: wrap auth.uid()/auth.jwt()/auth.role() in a sub-select so Postgres
--    evaluates them once per query instead of once per row (Supabase advisor
--    "auth_rls_initplan", 97 policies). Semantics are unchanged.
-- 3. Server-side aggregates for the super-admin analytics and dashboard pages,
--    which downloaded whole tables (every User, Round, attendance row) to the
--    browser and aggregated there. That grows without bound, and PostgREST
--    caps responses at 1000 rows, so the numbers went silently wrong past it.
-- ============================================================================


-- ── 1. Indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_casual_bookings_course_date
  on public.casual_tee_time_bookings (course_id, booking_date);
create index if not exists idx_casual_bookings_player
  on public.casual_tee_time_bookings (player_id);
create index if not exists idx_casual_players_booking
  on public.casual_tee_time_players (booking_id);
create index if not exists idx_casual_players_user
  on public.casual_tee_time_players (user_id);
create index if not exists idx_course_blocks_course_date
  on public.course_blocks (course_id, block_date);

create index if not exists idx_caddies_club_active_paid
  on public.caddies (club_id, is_active, paid_until);
create index if not exists idx_caddies_user
  on public.caddies (user_id);
create index if not exists idx_caddie_payments_status_created
  on public.caddie_payments (status, created_at);

create index if not exists idx_club_posts_club_created
  on public.club_posts (club_id, created_at desc);
create index if not exists idx_club_posts_author
  on public.club_posts (author_id);
create index if not exists idx_competitions_club
  on public.competitions (club_id);
create index if not exists idx_competition_results_entry
  on public.competition_results (entry_id);
create index if not exists idx_competition_results_player
  on public.competition_results (player_id);
create index if not exists idx_platform_flags_club
  on public.platform_flags (club_id);
create index if not exists idx_platform_flags_caddie
  on public.platform_flags (caddie_id);
create index if not exists idx_admin_notifications_club
  on public.admin_notifications (club_id);

create index if not exists idx_round_user_played
  on public."Round" ("userId", "playedAt" desc);
create index if not exists idx_booking_caddie on public."Booking" ("caddieId");
create index if not exists idx_booking_player on public."Booking" ("playerId");
create index if not exists idx_message_booking on public."Message" ("bookingId");
create index if not exists idx_message_sender on public."Message" ("senderId");
create index if not exists idx_message_receiver on public."Message" ("receiverId");
create index if not exists idx_drill_assignments_player on public.drill_assignments (player_id);
create index if not exists idx_drill_assignments_coach on public.drill_assignments (coach_id);
create index if not exists idx_drills_creator on public.drills (creator_id);
create index if not exists idx_session_waitlist_player on public.session_waitlist (player_id);


-- ── 2. RLS init-plan rewrite ────────────────────────────────────────────────
do $$
declare
  p record;
  fixed_qual text;
  fixed_check text;
  stmt text;
  fn text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.(uid|jwt|role)\(\)' or with_check ~ 'auth\.(uid|jwt|role)\(\)')
  loop
    fixed_qual := p.qual;
    fixed_check := p.with_check;
    foreach fn in array array['uid', 'jwt', 'role'] loop
      -- Wrap every call, then undo the double wrap on calls that were
      -- already sub-selected (deparsed as "( SELECT auth.uid() AS uid)").
      fixed_qual := replace(fixed_qual, 'auth.' || fn || '()', '(select auth.' || fn || '())');
      fixed_qual := replace(fixed_qual, 'SELECT (select auth.' || fn || '())', 'SELECT auth.' || fn || '()');
      fixed_check := replace(fixed_check, 'auth.' || fn || '()', '(select auth.' || fn || '())');
      fixed_check := replace(fixed_check, 'SELECT (select auth.' || fn || '())', 'SELECT auth.' || fn || '()');
    end loop;

    if fixed_qual is not distinct from p.qual and fixed_check is not distinct from p.with_check then
      continue;
    end if;

    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if fixed_qual is not null then
      stmt := stmt || format(' using (%s)', fixed_qual);
    end if;
    if fixed_check is not null then
      stmt := stmt || format(' with check (%s)', fixed_check);
    end if;
    execute stmt;
  end loop;
end;
$$;


-- ── 3. Super-admin aggregates ───────────────────────────────────────────────
-- Month and day boundaries use Kenyan time, which is what admins see.

create or replace function public.platform_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tz constant text := 'Africa/Nairobi';
  today date := (now() at time zone tz)::date;
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'players',  (select count(*) from "User" where upper(role::text) = 'PLAYER'),
    'coaches',  (select count(*) from "User" where upper(role::text) = 'COACH'),
    'caddies',  (select count(*) from caddies),
    'usersLast30d', (select count(*) from "User" where "createdAt" > now() - interval '30 days'),
    'usersPrev30d', (select count(*) from "User"
                     where "createdAt" > now() - interval '60 days'
                       and "createdAt" <= now() - interval '30 days'),
    'activePlayers7d',  (select count(distinct "userId") from "Round" where "playedAt" > now() - interval '7 days'),
    'activePlayers30d', (select count(distinct "userId") from "Round" where "playedAt" > now() - interval '30 days'),
    'activeCaddies7d',  (select count(distinct caddie_id) from caddie_attendance
                         where time_in is not null and date > today - 7),
    'activeCaddies30d', (select count(distinct caddie_id) from caddie_attendance
                         where time_in is not null and date > today - 30),
    'totalClubs', (select count(*) from clubs),
    'clubsWithAdmin', (select count(distinct club_id) from club_admins),
    'totalVolume', (select coalesce(sum(amount_kes), 0) from caddie_payments where status = 'confirmed'),
    'activePaidCaddies', (select count(*) from caddies where is_active and paid_until > now()),
    'expiring7d', (select count(*) from caddies
                   where is_active and paid_until > now() and paid_until < now() + interval '7 days'),
    'flaggedIssues', (select count(*) from platform_flags where not resolved),

    'months', (
      select coalesce(jsonb_agg(m order by m->>'start'), '[]'::jsonb) from (
        select jsonb_build_object(
          'start', to_char(ms, 'YYYY-MM-DD'),
          'volume', (select coalesce(sum(amount_kes), 0) from caddie_payments
                     where status = 'confirmed'
                       and paid_at >= (ms at time zone tz)
                     and paid_at < ((ms + interval '1 month') at time zone tz)),
          'paidCaddies', (select count(*) from caddies
                          where (created_at at time zone tz) < ms + interval '1 month'
                            and (paid_until at time zone tz) >= ms + interval '1 month' - interval '1 second')
        ) as m
        from generate_series(date_trunc('month', today::timestamp) - interval '5 months',
                             date_trunc('month', today::timestamp), interval '1 month') as ms
      ) t
    ),

    'dailyRounds', (
      select coalesce(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) order by d), '[]'::jsonb)
      from (
        -- "playedAt" is timestamp without time zone holding UTC.
        select g.d::date as d, coalesce(r.c, 0) as c
        from generate_series(today - 29, today, interval '1 day') as g(d)
        left join (
          select ("playedAt" at time zone 'UTC' at time zone tz)::date as day, count(*) as c
          from "Round"
          where "playedAt" >= (today - 30)::timestamp
          group by 1
        ) r on r.day = g.d::date
      ) t
    ),

    'courses', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'name', name, 'count', cnt, 'avgScore', avg_score) order by cnt desc), '[]'::jsonb)
      from (
        select coalesce("courseName", 'Unknown Course') as name,
               count(*) as cnt,
               round(avg(nullif("totalScore", 0))::numeric, 1) as avg_score
        from "Round"
        group by 1
      ) t
    ),

    'clubs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'location', c.location,
        'rosterSize', (select count(*) from caddies k where k.club_id = c.id),
        'activeSubs', (select count(*) from caddies k where k.club_id = c.id and k.paid_until > now()),
        'hasAdmin', exists (select 1 from club_admins a where a.club_id = c.id),
        'checkIns30d', (select count(*) from caddie_attendance a
                        where a.club_id = c.id and a.time_in is not null
                          and not coalesce(a.is_absent, false) and a.date > today - 30)
      )), '[]'::jsonb)
      from clubs c
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.platform_analytics() from public, anon;
grant execute on function public.platform_analytics() to authenticated;


create or replace function public.platform_dashboard_summary(p_club_limit int default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tz constant text := 'Africa/Nairobi';
begin
  if not public.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    -- Confirmed revenue summed per Kenyan day. The dashboard chart and
    -- totals are built from this, so the payload grows with days, not
    -- with the number of payments. Noon avoids any browser time-zone
    -- shifting the day.
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'created_at', to_char(day, 'YYYY-MM-DD') || 'T12:00:00',
        'amount_kes', amount) order by day), '[]'::jsonb)
      from (
        select (created_at at time zone tz)::date as day, sum(amount_kes) as amount
        from caddie_payments
        where status = 'confirmed'
        group by 1
      ) t
    ),
    'clubs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.name,
        'caddies', (select count(*) from caddies k where k.club_id = c.id and k.is_active),
        'active', (select count(*) from caddies k where k.club_id = c.id and k.is_active and k.paid_until > now())
      ) order by c.name), '[]'::jsonb)
      from (select id, name from clubs where status = 'active' order by name limit p_club_limit) c
    )
  );
end;
$$;

revoke execute on function public.platform_dashboard_summary(int) from public, anon;
grant execute on function public.platform_dashboard_summary(int) to authenticated;

notify pgrst, 'reload schema';
