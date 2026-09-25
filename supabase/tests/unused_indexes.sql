-- Indexes never used since statistics were last reset.
-- Run a few weeks after 2026-09-26 (when the performance indexes were added),
-- once real traffic has hit them. Don't drop anything that backs a primary
-- key, unique constraint or foreign key, or that serves a rare but important
-- query (month-end reports, admin screens).
select
  s.relname as table_name,
  s.indexrelname as index_name,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as size,
  s.idx_scan as scans,
  i.indisunique as is_unique,
  (select stats_reset from pg_stat_database where datname = current_database()) as stats_since
from pg_stat_user_indexes s
join pg_index i on i.indexrelid = s.indexrelid
where s.schemaname = 'public'
  and s.idx_scan = 0
  and not i.indisprimary
order by pg_relation_size(s.indexrelid) desc;
