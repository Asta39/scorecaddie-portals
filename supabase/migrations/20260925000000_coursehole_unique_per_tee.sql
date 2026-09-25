-- The scorecard editor stores one CourseHole row per (tee, hole) so each tee
-- keeps its own yardage. The legacy unique key on (courseId, holeNumber)
-- allowed only one row per hole, so saving more than one tee failed.
-- uniq_coursehole_tee_hole already enforces one row per (teeId, holeNumber);
-- legacy rows without a tee stay unique per (courseId, holeNumber).
alter table public."CourseHole" drop constraint if exists "CourseHole_courseId_holeNumber_key";
drop index if exists public."CourseHole_courseId_holeNumber_key";

create unique index if not exists uniq_coursehole_course_hole_no_tee
  on public."CourseHole"("courseId", "holeNumber")
  where "teeId" is null;

notify pgrst, 'reload schema';
