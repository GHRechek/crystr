-- Witches can move a page under another (or out to the top): cr_wiki_set_parent, which
-- refuses a page under itself or under one of its own descendants. And the Forsaken's
-- family: Planar moves under The Forsaken; Undead is new under it, with Zombies, Vampires
-- and Banshees under Undead. Pages that exist are moved, not remade.
create or replace function public.cr_wiki_set_parent(p_page bigint, p_parent bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_walk bigint := p_parent; v_steps int := 0;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if not exists (select 1 from public.wiki_pages where id = p_page) then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if p_parent is not null then
    if p_parent = p_page then return jsonb_build_object('ok', false, 'code', 'circular'); end if;
    if not exists (select 1 from public.wiki_pages where id = p_parent) then
      return jsonb_build_object('ok', false, 'code', 'bad_parent');
    end if;
    -- Up from the would-be parent: reaching the page itself would make a loop.
    while v_walk is not null and v_steps < 100 loop
      if v_walk = p_page then return jsonb_build_object('ok', false, 'code', 'circular'); end if;
      select parent_id into v_walk from public.wiki_pages where id = v_walk;
      v_steps := v_steps + 1;
    end loop;
  end if;
  update public.wiki_pages set parent_id = p_parent, sort = 0, updated_by = auth.uid(), updated_at = now()
   where id = p_page;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_wiki_set_parent(bigint, bigint) from public, anon;
grant execute on function public.cr_wiki_set_parent(bigint, bigint) to authenticated;

do $$
declare v_author uuid; v_forsaken bigint; v_undead bigint; r record; v_id bigint;
begin
  select id into v_author from public.profiles where is_witch order by created_at limit 1;
  if v_author is null then select id into v_author from public.profiles order by created_at limit 1; end if;
  if v_author is null then return; end if;

  select id into v_forsaken from public.wiki_pages where slug = 'the-forsaken';
  if v_forsaken is null then
    insert into public.wiki_pages (slug, title, slots, created_by, updated_by) values ('the-forsaken', 'The Forsaken', 6, v_author, v_author)
    returning id into v_forsaken;
  end if;

  update public.wiki_pages set parent_id = v_forsaken where slug = 'planar' and parent_id is distinct from v_forsaken;

  select id into v_undead from public.wiki_pages where slug = 'undead';
  if v_undead is null then
    insert into public.wiki_pages (slug, title, slots, created_by, updated_by, parent_id) values ('undead', 'Undead', 6, v_author, v_author, v_forsaken)
    returning id into v_undead;
  else
    update public.wiki_pages set parent_id = v_forsaken where id = v_undead and parent_id is null;
  end if;

  for r in select * from (values ('zombies', 'Zombies'), ('vampires', 'Vampires'), ('banshees', 'Banshees')) as t(slug, title) loop
    select id into v_id from public.wiki_pages where slug = r.slug;
    if v_id is null then
      insert into public.wiki_pages (slug, title, slots, created_by, updated_by, parent_id) values (r.slug, r.title, 6, v_author, v_author, v_undead);
    else
      update public.wiki_pages set parent_id = v_undead where id = v_id and parent_id is null;
    end if;
  end loop;
end $$;
