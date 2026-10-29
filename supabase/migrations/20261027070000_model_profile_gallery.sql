-- Apply only after reviewing existing models/profiles schema and RLS in staging.
-- Additive: no old columns, records, or Storage objects are deleted.
begin;
alter table public.models add column if not exists gallery_urls text[] not null default '{}';
alter table public.models add constraint models_gallery_max_10 check (cardinality(gallery_urls) <= 10);
alter table public.models enable row level security;
create policy "model profile public active read" on public.models for select to anon, authenticated using (is_active = true);
create policy "model profile admin read" on public.models for select to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy "model profile admin insert" on public.models for insert to authenticated with check (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy "model profile admin update" on public.models for update to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
) with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('model-images', 'model-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- This public bucket contains public portfolio photos only. No DELETE/overwrite path is added.
create policy "model images public read" on storage.objects for select to anon, authenticated using (bucket_id = 'model-images');
create policy "model images admin upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'model-images' and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
commit;
