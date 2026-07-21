-- Menu PDF documents: club admins upload a full menu/wine-list PDF; players
-- see a first-page preview and can open the whole document in-app.

create table if not exists public.club_menu_documents (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  pdf_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_menu_documents_club on public.club_menu_documents(club_id);

alter table public.club_menu_documents enable row level security;

drop policy if exists "menu_documents_read" on public.club_menu_documents;
create policy "menu_documents_read" on public.club_menu_documents
  for select to authenticated
  using (true);

drop policy if exists "menu_documents_admin_write" on public.club_menu_documents;
create policy "menu_documents_admin_write" on public.club_menu_documents
  for all to authenticated
  using (club_id = (select club_id from public.club_admins where user_id = auth.uid()))
  with check (club_id = (select club_id from public.club_admins where user_id = auth.uid()));

drop trigger if exists trg_menu_documents_updated_at on public.club_menu_documents;
create trigger trg_menu_documents_updated_at before update on public.club_menu_documents
  for each row execute function public.set_restaurant_updated_at();

-- Storage bucket for the PDFs themselves.
insert into storage.buckets (id, name, public)
values ('menu-pdfs', 'menu-pdfs', true)
on conflict (id) do nothing;

drop policy if exists "menu_pdfs_public_read" on storage.objects;
create policy "menu_pdfs_public_read" on storage.objects
  for select to public
  using (bucket_id = 'menu-pdfs');

-- Admins may only write into a folder matching their own club_id (path: <club_id>/<filename>.pdf).
drop policy if exists "menu_pdfs_admin_write" on storage.objects;
create policy "menu_pdfs_admin_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-pdfs'
    and (storage.foldername(name))[1] = (select club_id from public.club_admins where user_id = auth.uid())::text
  );

drop policy if exists "menu_pdfs_admin_delete" on storage.objects;
create policy "menu_pdfs_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-pdfs'
    and (storage.foldername(name))[1] = (select club_id from public.club_admins where user_id = auth.uid())::text
  );
