-- Restaurant module: per-club dining/meeting locations, their tables, a menu,
-- and player table reservations. Locations map to Muthaiga-style setups
-- (Tai Lounge, board rooms, sports bar, pavilion) — some are bookable for
-- casual dining, others (meeting rooms) are admin-indicated as not bookable.

create table if not exists public.club_restaurant_locations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  is_bookable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restaurant_locations_club on public.club_restaurant_locations(club_id);

create table if not exists public.club_restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.club_restaurant_locations(id) on delete cascade,
  table_number text not null,
  shape text not null check (shape in ('round', 'rectangular')),
  seat_count integer not null check (seat_count > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, table_number)
);

create index if not exists idx_restaurant_tables_location on public.club_restaurant_tables(location_id);

create table if not exists public.club_menu_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'main' check (category in ('starter', 'main', 'dessert', 'drink', 'special')),
  price_kes numeric(10, 2),
  chef_name text,
  chef_photo_url text,
  photo_url text,
  is_new boolean not null default false,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_menu_items_club on public.club_menu_items(club_id);

create table if not exists public.club_restaurant_reservations (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.club_restaurant_tables(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  party_size integer not null check (party_size > 0),
  reservation_date date not null,
  reservation_time time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservations_table_date on public.club_restaurant_reservations(table_id, reservation_date, reservation_time);
create index if not exists idx_reservations_player on public.club_restaurant_reservations(player_id);
create index if not exists idx_reservations_club on public.club_restaurant_reservations(club_id);

-- One confirmed reservation per table per date/time slot.
create unique index if not exists uniq_confirmed_table_slot
  on public.club_restaurant_reservations(table_id, reservation_date, reservation_time)
  where (status = 'confirmed');

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────
alter table public.club_restaurant_locations enable row level security;
alter table public.club_restaurant_tables enable row level security;
alter table public.club_menu_items enable row level security;
alter table public.club_restaurant_reservations enable row level security;

-- Locations: anyone signed in can read (needed to browse before booking);
-- only that club's admins can manage.
drop policy if exists "restaurant_locations_read" on public.club_restaurant_locations;
create policy "restaurant_locations_read" on public.club_restaurant_locations
  for select to authenticated
  using (true);

drop policy if exists "restaurant_locations_admin_write" on public.club_restaurant_locations;
create policy "restaurant_locations_admin_write" on public.club_restaurant_locations
  for all to authenticated
  using (club_id = (select club_id from public.club_admins where user_id = auth.uid()))
  with check (club_id = (select club_id from public.club_admins where user_id = auth.uid()));

-- Tables: read via parent location's club; write restricted to that club's admins.
drop policy if exists "restaurant_tables_read" on public.club_restaurant_tables;
create policy "restaurant_tables_read" on public.club_restaurant_tables
  for select to authenticated
  using (true);

drop policy if exists "restaurant_tables_admin_write" on public.club_restaurant_tables;
create policy "restaurant_tables_admin_write" on public.club_restaurant_tables
  for all to authenticated
  using (
    location_id in (
      select l.id from public.club_restaurant_locations l
      where l.club_id = (select club_id from public.club_admins where user_id = auth.uid())
    )
  )
  with check (
    location_id in (
      select l.id from public.club_restaurant_locations l
      where l.club_id = (select club_id from public.club_admins where user_id = auth.uid())
    )
  );

-- Menu: anyone signed in can read; only that club's admins can manage.
drop policy if exists "menu_items_read" on public.club_menu_items;
create policy "menu_items_read" on public.club_menu_items
  for select to authenticated
  using (true);

drop policy if exists "menu_items_admin_write" on public.club_menu_items;
create policy "menu_items_admin_write" on public.club_menu_items
  for all to authenticated
  using (club_id = (select club_id from public.club_admins where user_id = auth.uid()))
  with check (club_id = (select club_id from public.club_admins where user_id = auth.uid()));

-- Reservations: a player sees/manages only their own; a club admin sees/manages
-- all reservations for their own club (they run the floor).
drop policy if exists "reservations_own_read" on public.club_restaurant_reservations;
create policy "reservations_own_read" on public.club_restaurant_reservations
  for select to authenticated
  using (
    player_id = auth.uid()
    or club_id = (select club_id from public.club_admins where user_id = auth.uid())
  );

drop policy if exists "reservations_own_insert" on public.club_restaurant_reservations;
create policy "reservations_own_insert" on public.club_restaurant_reservations
  for insert to authenticated
  with check (player_id = auth.uid());

drop policy if exists "reservations_update" on public.club_restaurant_reservations;
create policy "reservations_update" on public.club_restaurant_reservations
  for update to authenticated
  using (
    player_id = auth.uid()
    or club_id = (select club_id from public.club_admins where user_id = auth.uid())
  )
  with check (
    player_id = auth.uid()
    or club_id = (select club_id from public.club_admins where user_id = auth.uid())
  );

-- Keep updated_at fresh.
create or replace function public.set_restaurant_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_locations_updated_at on public.club_restaurant_locations;
create trigger trg_locations_updated_at before update on public.club_restaurant_locations
  for each row execute function public.set_restaurant_updated_at();

drop trigger if exists trg_tables_updated_at on public.club_restaurant_tables;
create trigger trg_tables_updated_at before update on public.club_restaurant_tables
  for each row execute function public.set_restaurant_updated_at();

drop trigger if exists trg_menu_items_updated_at on public.club_menu_items;
create trigger trg_menu_items_updated_at before update on public.club_menu_items
  for each row execute function public.set_restaurant_updated_at();

drop trigger if exists trg_reservations_updated_at on public.club_restaurant_reservations;
create trigger trg_reservations_updated_at before update on public.club_restaurant_reservations
  for each row execute function public.set_restaurant_updated_at();
