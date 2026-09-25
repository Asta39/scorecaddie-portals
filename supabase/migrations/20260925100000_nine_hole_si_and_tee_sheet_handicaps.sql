-- ============================================================================
-- 1. Nine-hole stroke index
--
-- Many Kenyan cards (e.g. Nyeri) print two stroke indexes per hole: the large
-- one for an 18-hole round and a small one (1-9 within each nine) used when
-- only the front or back nine is played. Stroke index is also per tee: on a
-- nine-hole course played twice, "Course 1" and "Course 2" are separate tees
-- with their own yardages AND their own stroke indexes on the same holes.
-- CourseHole already stores one row per (tee, hole), so handicapIndex is
-- already per tee; this adds the nine-hole index alongside it.
-- ============================================================================
alter table public."CourseHole"
  add column if not exists "nineHoleIndex" integer;

do $$
begin
  alter table public."CourseHole"
    add constraint coursehole_nine_hole_index_range
    check ("nineHoleIndex" is null or "nineHoleIndex" between 1 and 9);
exception when duplicate_object then null;
end;
$$;


-- ============================================================================
-- 2. Tee sheet handicaps
--
-- The tee sheet shows each player's Handicap Index, Course Handicap and
-- Playing Handicap. CH needs a tee's rating and slope; PH needs the
-- handicap allowance. The club picks both here.
-- ============================================================================
alter table public.course_tee_time_settings
  add column if not exists handicap_tee_id text references public."Tee"(id) on delete set null,
  add column if not exists handicap_allowance numeric(5,2) not null default 95;

do $$
begin
  alter table public.course_tee_time_settings
    add constraint course_tee_time_settings_allowance_range
    check (handicap_allowance > 0 and handicap_allowance <= 100);
exception when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';
