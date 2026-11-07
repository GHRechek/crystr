-- A wiki page for Historikals, with its first facts kept.
do $$
declare v_by uuid := (select id from public.profiles where handle = 'sammiwithaneye'); v_page bigint;
begin
  if exists (select 1 from public.wiki_pages where slug = 'historikals') then return; end if;
  insert into public.wiki_pages (slug, title, slots, created_by, updated_by) values ('historikals', 'Historikals', 8, v_by, v_by) returning id into v_page;
  insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
  select v_page, n, body, v_by, 'kept', v_by, now()
    from unnest(array[
      'An old game with newfound popularity',
      'Sometimes problematic depictions',
      'Common, uncommon, rare, and legendary',
      'Well over a hundred types',
      'Probably not alive',
      'Might be Egregores'
    ]) with ordinality as t(body, n);
end $$;
