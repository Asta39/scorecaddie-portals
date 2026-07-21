-- Applied to production 2026-07-20 (project qqvzklonfybticckpuvx) via MCP.
--
-- Per-org brand color: each club themes its club-admin portal; the platform
-- brand color themes the super-admin portal. UIs derive their whole accent
-- scale from this single value via color-mix.
alter table public.clubs add column if not exists brand_color text not null default '#0f766e';

insert into public.platform_config (key, value, description)
values ('platform_brand_color', '#0f766e', 'Brand accent color for the super-admin portal UI')
on conflict (key) do nothing;
