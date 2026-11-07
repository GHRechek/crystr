-- Witches can rename a wiki page. Its address (the slug) stays, so links to it keep working.
create or replace function public.cr_wiki_rename(p_id bigint, p_title text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g'));
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if char_length(v) < 1 or char_length(v) > 120 then return jsonb_build_object('ok', false, 'code', 'bad_title'); end if;
  update public.wiki_pages set title = v, updated_by = auth.uid(), updated_at = now() where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true, 'title', v);
end;
$$;
revoke all on function public.cr_wiki_rename(bigint, text) from public, anon;
grant execute on function public.cr_wiki_rename(bigint, text) to authenticated;
