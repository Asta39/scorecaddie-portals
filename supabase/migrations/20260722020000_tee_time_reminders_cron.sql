-- Player app had a "Tee Time Reminder" toggle that never persisted (the
-- insert didn't set the `notify` column) and no job existed anywhere to
-- actually fire the push — no cron, no edge function call. This schedules
-- the send-tee-time-reminders edge function every 5 minutes via pg_cron +
-- pg_net (Vercel Hobby only allows daily crons, so this runs inside
-- Postgres instead).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('tee-time-reminders') where exists (
  select 1 from cron.job where jobname = 'tee-time-reminders'
);

select cron.schedule(
  'tee-time-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://qqvzklonfybticckpuvx.supabase.co/functions/v1/send-tee-time-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnprbG9uZnlidGljY2twdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTgzMTAsImV4cCI6MjA5MDc5NDMxMH0.SwTK7ZSdT1r4RjOBQIlKB6CVN6KUq9mBOpL4zRbMyog'
    ),
    body := '{}'::jsonb
  );
  $$
);
