-- Adding to the wiki is now limited to 4 words (80 characters), witches included.
-- cr_wiki_add_fact's check is `cardinality(regexp_split_to_array(v_body, ' ')) > 4`.
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
        v_paid boolean := false;
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
    update public.wiki_facts
       set body = v_body, status = 'kept', note = '', created_at = now(),
           reviewed_by = auth.uid(), reviewed_at = now()
     where page_id = p_page and slot = v_slot and author = auth.uid() and status = 'pending'
    returning id into v_id;
    if found then
      v_paid := true;
    else
      if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
      perform public.cr_take(v_cost, 'Wiki fact — ' || pg.title, 'wiki');
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
    return jsonb_build_object('ok', true, 'id', v_id, 'slot', v_slot, 'kept', true, 'cost', case when v_paid then 0 else v_cost end, 'mana', public.cr_balance());
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
