-- Witches alter the wiki at no mana cost: adding a fact and starting a sub page used to
-- charge them like anyone else.
create or replace function public.cr_wiki_add_fact(p_page bigint, p_slot integer, p_body text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare pg public.wiki_pages%rowtype;
        v_body text := btrim(regexp_replace(public.cr_strip_invisible(p_body), '[[:space:]]+', ' ', 'g'));
        v_slot int := p_slot;
        v_cost int := 2;
        v_id bigint;
begin
  select * into pg from public.wiki_pages where id = p_page;
  if not found or pg.archived then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if pg.locked and not public.is_witch() then
    return jsonb_build_object('ok', false, 'code', 'locked');
  end if;

  if v_slot is null then
    v_slot := coalesce((select max(slot) from public.wiki_facts where page_id = p_page), 0) + 1;
    if v_slot > 300 then return jsonb_build_object('ok', false, 'code', 'full'); end if;
  elsif v_slot < 1 or v_slot > pg.slots then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;

  if char_length(v_body) = 0 then return jsonb_build_object('ok', false, 'code', 'empty'); end if;
  if char_length(v_body) > 80 or cardinality(regexp_split_to_array(v_body, ' ')) > 4 then
    return jsonb_build_object('ok', false, 'code', 'too_long');
  end if;
  if exists (select 1 from public.wiki_facts where page_id = p_page and slot = v_slot and status = 'kept') then
    return jsonb_build_object('ok', false, 'code', 'settled');
  end if;

  if public.is_witch() then
    -- A witch's fact is kept at once and costs nothing.
    update public.wiki_facts
       set body = v_body, status = 'kept', note = '', created_at = now(),
           reviewed_by = auth.uid(), reviewed_at = now()
     where page_id = p_page and slot = v_slot and author = auth.uid() and status = 'pending'
    returning id into v_id;
    if not found then
      insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
      values (p_page, v_slot, v_body, auth.uid(), 'kept', auth.uid(), now())
      returning id into v_id;
    end if;
    update public.wiki_facts
       set status = 'returned', note = 'A witch put a fact in this spot. Try adding another.',
           reviewed_by = auth.uid(), reviewed_at = now()
     where page_id = p_page and slot = v_slot and status = 'pending';
    update public.wiki_pages
       set slots = least(300, greatest(slots, v_slot + 2)),
           updated_by = auth.uid(), updated_at = now()
     where id = pg.id;
    return jsonb_build_object('ok', true, 'id', v_id, 'slot', v_slot, 'kept', true, 'cost', 0, 'mana', public.cr_balance());
  end if;

  update public.wiki_facts set body = v_body, created_at = now()
   where page_id = p_page and slot = v_slot and author = auth.uid() and status = 'pending'
  returning id into v_id;
  if found then return jsonb_build_object('ok', true, 'id', v_id, 'slot', v_slot, 'reworded', true); end if;

  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Wiki fact — ' || pg.title, 'wiki');
  insert into public.wiki_facts (page_id, slot, body, author)
  values (p_page, v_slot, v_body, auth.uid()) returning id into v_id;
  update public.wiki_pages set slots = least(300, greatest(slots, v_slot + 2)) where id = pg.id and slots < v_slot + 2;
  return jsonb_build_object('ok', true, 'id', v_id, 'slot', v_slot, 'cost', v_cost, 'mana', public.cr_balance());
end;
$function$;

create or replace function public.cr_wiki_add_subpage(p_parent bigint, p_title text, p_slug text, p_body text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare parent public.wiki_pages%rowtype;
        v_body text := btrim(regexp_replace(public.cr_strip_invisible(p_body), '[[:space:]]+', ' ', 'g'));
        v_title text := btrim(regexp_replace(public.cr_strip_invisible(coalesce(p_title, '')), '[[:space:]]+', ' ', 'g'));
        v_slug text := lower(btrim(coalesce(p_slug, '')));
        v_cost int := case when public.is_witch() then 0 else 40 end;
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

  -- Witches start pages for free.
  if v_cost > 0 then
    if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
    perform public.cr_take(v_cost, 'Started a page under ' || parent.title || ' — ' || v_title, 'wiki');
  end if;

  insert into public.wiki_pages (slug, title, slots, created_by, updated_by, parent_id)
  values (v_slug, v_title, 6, auth.uid(), auth.uid(), parent.id)
  returning id into v_id;
  insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
  values (v_id, 1, v_body, auth.uid(), 'kept', auth.uid(), now());
  update public.wiki_pages set updated_by = auth.uid(), updated_at = now() where id = parent.id;

  return jsonb_build_object('ok', true, 'id', v_id, 'slug', v_slug, 'cost', v_cost, 'mana', public.cr_balance());
end;
$function$;
