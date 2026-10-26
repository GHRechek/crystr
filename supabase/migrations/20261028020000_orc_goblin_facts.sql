-- Two more kept facts, in the first witch's name: Orcs are overrepresented in tech, and
-- goblin brands dominate fashion. Each goes in the next open slot of its page; a page that
-- already has the words is left alone.
do $$
declare v_author uuid; r record; v_page bigint; v_slot int;
begin
  select id into v_author from public.profiles where is_witch order by created_at limit 1;
  if v_author is null then select id into v_author from public.profiles order by created_at limit 1; end if;
  if v_author is null then return; end if;

  for r in select * from (values ('orcs', 'Overrepresented in Tech'), ('goblins', 'Goblin Brands dominate Fashion')) as t(slug, body) loop
    select id into v_page from public.wiki_pages where slug = r.slug;
    if v_page is null then continue; end if;
    if exists (select 1 from public.wiki_facts where page_id = v_page and status = 'kept' and lower(body) = lower(r.body)) then
      continue;
    end if;
    select coalesce(max(slot), 0) + 1 into v_slot from public.wiki_facts where page_id = v_page and status = 'kept';
    while exists (select 1 from public.wiki_facts where page_id = v_page and slot = v_slot) loop
      v_slot := v_slot + 1;
    end loop;
    insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
    values (v_page, v_slot, r.body, v_author, 'kept', v_author, now());
    update public.wiki_pages
       set slots = least(300, greatest(slots, v_slot + 2)), updated_by = v_author, updated_at = now()
     where id = v_page;
  end loop;
end $$;
