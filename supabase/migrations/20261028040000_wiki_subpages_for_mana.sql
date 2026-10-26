-- Anyone can start a page under the one they are adding to, for 40 mana. It opens at once
-- with their words as its first kept fact: at that price nobody waits for a witch, who can
-- still pause, archive or take the fact down as with any page. Same rules as a fact
-- otherwise: a few key words (up to four, eighty characters), a title, an address.
create or replace function public.cr_wiki_add_subpage(p_parent bigint, p_title text, p_slug text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare parent public.wiki_pages%rowtype;
        v_body text := btrim(regexp_replace(public.cr_strip_invisible(p_body), '[[:space:]]+', ' ', 'g'));
        v_title text := btrim(regexp_replace(public.cr_strip_invisible(coalesce(p_title, '')), '[[:space:]]+', ' ', 'g'));
        v_slug text := lower(btrim(coalesce(p_slug, '')));
        v_cost int := 40;
        v_id bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select * into parent from public.wiki_pages where id = p_parent;
  if not found or parent.archived then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if parent.locked and not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'locked'); end if;

  if char_length(v_title) = 0 then return jsonb_build_object('ok', false, 'code', 'no_title'); end if;
  if char_length(v_title) > 120 then return jsonb_build_object('ok', false, 'code', 'no_title'); end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 60 then
    return jsonb_build_object('ok', false, 'code', 'bad_slug');
  end if;
  if v_slug in ('new', 'to-read') or exists (select 1 from public.wiki_pages where slug = v_slug) then
    return jsonb_build_object('ok', false, 'code', 'taken');
  end if;
  if char_length(v_body) = 0 then return jsonb_build_object('ok', false, 'code', 'empty'); end if;
  if char_length(v_body) > 80 or cardinality(regexp_split_to_array(v_body, ' ')) > 4 then
    return jsonb_build_object('ok', false, 'code', 'too_long');
  end if;

  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Started a page under ' || parent.title || ' — ' || v_title, 'wiki');

  insert into public.wiki_pages (slug, title, slots, created_by, updated_by, parent_id)
  values (v_slug, v_title, 6, auth.uid(), auth.uid(), parent.id)
  returning id into v_id;
  insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
  values (v_id, 1, v_body, auth.uid(), 'kept', auth.uid(), now());
  update public.wiki_pages set updated_by = auth.uid(), updated_at = now() where id = parent.id;

  return jsonb_build_object('ok', true, 'id', v_id, 'slug', v_slug, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_wiki_add_subpage(bigint, text, text, text) from public, anon;
grant execute on function public.cr_wiki_add_subpage(bigint, text, text, text) to authenticated;
