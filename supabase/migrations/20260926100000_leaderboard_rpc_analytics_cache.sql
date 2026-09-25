-- ============================================================================
-- Follow-up performance pass (2026-09-26)
--
-- 1. get_leaderboard(): the app downloaded every matching round (with a User
--    join) and picked each golfer's best in Dart; at 200k rounds that was
--    ~470 ms of database time plus a 200k-row response, repeated by every
--    client on every change to Round or User. This returns each golfer's
--    best round, ranked, top N plus the caller's own row.
--    SECURITY INVOKER: row-level security on Round and User applies exactly
--    as it did to the old direct queries.
--
-- 2. platform_analytics() caches its result for five minutes (1.4 s at
--    200k rounds); the refresh button forces a recompute.
-- ============================================================================


-- ── 1. Leaderboard ──────────────────────────────────────────────────────────
create index if not exists idx_round_user_score on public."Round" ("userId", "totalScore");
create index if not exists idx_round_user_net on public."Round" ("userId", "totalNet");
create index if not exists idx_round_course on public."Round" ("courseId");

-- Built per option rather than one query with CASE/OR branches: a generic
-- plan can't use the (userId, score) indexes, and filters that don't apply
-- still cost a scan. The score column comes from a fixed allow-list and every
-- value is bound as a parameter, never spliced into the SQL.
create or replace function public.get_leaderboard(
  p_scope text default 'global',      -- global | friends | course
  p_period text default 'all',        -- all | month | week
  p_scoring text default 'gross',     -- gross | net
  p_course_id text default null,
  p_course_name text default null,
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  me text := (select auth.uid())::text;
  col text := case when p_scoring = 'net' then '"totalNet"' else '"totalScore"' end;
  since timestamp := case p_period
    when 'week' then (now() - interval '7 days')::timestamp
    when 'month' then (now() - interval '30 days')::timestamp
  end;
  lim int := greatest(1, least(coalesce(p_limit, 50), 500));
  scope_ids text[];
  filters text := format('r.%s > 0', col);
  result jsonb;
begin
  if since is not null then
    filters := filters || ' and r."playedAt" >= $1';
  end if;

  if p_scope = 'friends' then
    -- Same friend set the app used before: rows where the caller is userId.
    select array_append(coalesce(array_agg(f."friendId"), '{}'), me)
      into scope_ids
      from "Friend" f where f."userId" = me;
    filters := filters || ' and r."userId" = any($6)';
  elsif p_scope = 'course' and p_course_id is not null then
    -- Older rounds may only carry the course name.
    filters := filters || ' and (r."courseId" = $3 or ($4 is not null and r."courseName" = $4))';
  end if;

  execute format($q$
    with best as (
      select r."userId", min(r.%1$s) as score
      from "Round" r
      where %2$s
      group by r."userId"
    ),
    ranked as (
      -- rank: shown to players, ties share it. pos: cuts the list at
      -- exactly p_limit rows even when many golfers tie.
      select *, rank() over (order by score) as rnk,
             row_number() over (order by score, "userId") as pos
      from best
    ),
    shown as (select * from ranked where pos <= $5 or "userId" = $2)
    select coalesce(jsonb_agg(jsonb_build_object(
      'userId', s."userId",
      'courseId', br."courseId",
      'courseName', br."courseName",
      'playedAt', br."playedAt",
      'score', s.score,
      'rank', s.rnk,
      'User', jsonb_build_object(
        'id', u.id, 'name', u.name, 'avatarUrl', u."avatarUrl",
        'handicapIndex', u."handicapIndex", 'isProvisional', u."isProvisional",
        'handicapOrigin', u."handicapOrigin")
    ) order by s.pos), '[]'::jsonb)
    from shown s
    left join "User" u on u.id = s."userId"
    left join lateral (
      -- The round that produced the best score (earliest if repeated).
      select r."courseId", r."courseName", r."playedAt"
      from "Round" r
      where r."userId" = s."userId" and r.%1$s = s.score and %2$s
      order by r."playedAt"
      limit 1
    ) br on true
  $q$, col, filters)
  into result
  using since, me, p_course_id, p_course_name, lim, scope_ids;

  return result;
end;
$$;

revoke execute on function public.get_leaderboard(text, text, text, text, text, int) from public, anon;
grant execute on function public.get_leaderboard(text, text, text, text, text, int) to authenticated;


-- ── 2. Analytics cache ──────────────────────────────────────────────────────
create table if not exists public.platform_analytics_cache (
  id int primary key default 1 check (id = 1),
  payload jsonb not null,
  computed_at timestamptz not null default now()
);
-- Only reachable through the functions below.
alter table public.platform_analytics_cache enable row level security;
revoke all on public.platform_analytics_cache from anon, authenticated;

alter function public.platform_analytics() rename to platform_analytics_compute;
revoke execute on function public.platform_analytics_compute() from public, anon, authenticated;

create or replace function public.platform_analytics(p_force boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  cached record;
  fresh jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not p_force then
    select payload, computed_at into cached from platform_analytics_cache where id = 1;
    if found and cached.computed_at > now() - interval '5 minutes' then
      return cached.payload || jsonb_build_object('computedAt', cached.computed_at);
    end if;
  end if;

  fresh := public.platform_analytics_compute();
  insert into platform_analytics_cache (id, payload, computed_at)
  values (1, fresh, now())
  on conflict (id) do update set payload = excluded.payload, computed_at = excluded.computed_at;

  return fresh || jsonb_build_object('computedAt', now());
end;
$$;

revoke execute on function public.platform_analytics(boolean) from public, anon;
grant execute on function public.platform_analytics(boolean) to authenticated;

notify pgrst, 'reload schema';
