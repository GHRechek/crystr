-- Sprites edited in the app. A witch's edit is saved as a PNG in the sprites bucket, and the app draws
-- that in place of the file it shipped with: portrait/<Sheet>/<id>.png for a portrait cell, and
-- creatures/<file>.png for a Historikal picture. The table lists what has been overridden, so the app
-- knows without asking the bucket, and when (a cache-buster for the faces and pictures that change).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sprites', 'sprites', true, 1048576, array['image/png'])
on conflict (id) do nothing;

create policy "witches write sprites" on storage.objects for insert to authenticated
  with check (bucket_id = 'sprites' and public.is_witch());
create policy "witches replace sprites" on storage.objects for update to authenticated
  using (bucket_id = 'sprites' and public.is_witch());
create policy "witches remove sprites" on storage.objects for delete to authenticated
  using (bucket_id = 'sprites' and public.is_witch());
create policy "anyone reads sprites" on storage.objects for select to anon, authenticated
  using (bucket_id = 'sprites');

create table if not exists public.sprite_overrides (
  path text primary key,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.sprite_overrides enable row level security;
create policy "anyone reads the override list" on public.sprite_overrides for select to anon, authenticated using (true);
create policy "witches add overrides" on public.sprite_overrides for insert to authenticated with check (public.is_witch());
create policy "witches change overrides" on public.sprite_overrides for update to authenticated using (public.is_witch());
create policy "witches drop overrides" on public.sprite_overrides for delete to authenticated using (public.is_witch());
