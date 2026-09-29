-- Each club gets its own mascot. A mascot is a short key such as 'cat' or
-- 'droid' (the 18 bot-avatars types, plus ScoreCaddie's own shapes later).
-- The unique index is what guarantees two clubs never share one, even when
-- two admins save at the same moment.
alter table public.clubs add column if not exists mascot text;

alter table public.clubs drop constraint if exists clubs_mascot_format;
alter table public.clubs add constraint clubs_mascot_format
  check (mascot is null or mascot ~ '^[a-z][a-z0-9_]{1,31}$');

create unique index if not exists clubs_mascot_unique
  on public.clubs (mascot) where mascot is not null;
