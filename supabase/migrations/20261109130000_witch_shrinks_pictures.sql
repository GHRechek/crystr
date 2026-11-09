-- Witches can put a smaller copy of a picture back in its place. Pictures posted before the app shrank them
-- on the phone are 2–3 MB; the SHRINK PICTURES tool on /bugs fetches each, shrinks it in the browser and
-- uploads it over the original, so every post keeps pointing at the same file. Two things make that possible:
-- witches may update objects in the proofs bucket, and cr_big_pictures tells them which are worth it.
create policy "witch replaces proof" on storage.objects for update to authenticated
  using (bucket_id = 'proofs' and public.is_witch())
  with check (bucket_id = 'proofs' and public.is_witch());

create or replace function public.cr_big_pictures(p_min_kb int default 400)
returns table (name text, bytes bigint, mimetype text) language sql security definer set search_path = public, storage as $$
  select o.name, (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
    from storage.objects o
   where o.bucket_id = 'proofs' and public.is_witch()
     and (o.metadata->>'size')::bigint > p_min_kb * 1024
     and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
   order by (o.metadata->>'size')::bigint desc;
$$;
revoke all on function public.cr_big_pictures(int) from public, anon;
grant execute on function public.cr_big_pictures(int) to authenticated;
