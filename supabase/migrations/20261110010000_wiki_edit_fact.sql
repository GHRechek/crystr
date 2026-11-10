-- Witches edit a kept fact's words in place, from the page itself (tap the fact).
create or replace function public.cr_wiki_edit_fact(p_fact bigint, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f public.wiki_facts%rowtype; v_body text := btrim(coalesce(p_body, ''));
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if char_length(v_body) not between 1 and 80 then return jsonb_build_object('ok', false, 'code', 'bad_input'); end if;
  select * into f from public.wiki_facts where id = p_fact and status = 'kept' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  update public.wiki_facts set body = v_body where id = f.id;
  update public.wiki_pages set updated_by = auth.uid(), updated_at = now() where id = f.page_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_wiki_edit_fact(bigint, text) from public, anon;
grant execute on function public.cr_wiki_edit_fact(bigint, text) to authenticated;
