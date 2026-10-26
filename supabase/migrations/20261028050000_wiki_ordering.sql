-- Witches put a page's facts and sub pages in the order they want, from the moderation tile.
--
--  * cr_wiki_move_fact swaps a kept fact's slot with the kept fact before or after it (the
--    one unique kept slot per page is kept honest by going through a spare slot).
--  * wiki_pages.sort orders the pages under one parent; cr_wiki_move_page swaps a page with
--    its neighbour. Pages under a parent read in sort order, then by title.
alter table public.wiki_pages add column if not exists sort int not null default 0;

create or replace function public.cr_wiki_move_fact(p_fact bigint, p_dir int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f public.wiki_facts%rowtype; o public.wiki_facts%rowtype;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into f from public.wiki_facts where id = p_fact and status = 'kept' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if coalesce(p_dir, 0) < 0 then
    select * into o from public.wiki_facts
     where page_id = f.page_id and status = 'kept' and slot < f.slot order by slot desc limit 1 for update;
  else
    select * into o from public.wiki_facts
     where page_id = f.page_id and status = 'kept' and slot > f.slot order by slot asc limit 1 for update;
  end if;
  if not found then return jsonb_build_object('ok', true, 'unchanged', true); end if;

  -- Through a spare slot, so the one-kept-fact-per-slot rule holds at every step.
  update public.wiki_facts set slot = 100000 where id = f.id;
  update public.wiki_facts set slot = f.slot where id = o.id;
  update public.wiki_facts set slot = o.slot where id = f.id;
  update public.wiki_pages set updated_by = auth.uid(), updated_at = now() where id = f.page_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_wiki_move_fact(bigint, int) from public, anon;
grant execute on function public.cr_wiki_move_fact(bigint, int) to authenticated;

create or replace function public.cr_wiki_move_page(p_page bigint, p_dir int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pg public.wiki_pages%rowtype; v_at int; v_n int; v_other bigint;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into pg from public.wiki_pages where id = p_page;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  -- Number the siblings 1..n in their present order, then swap with the neighbour.
  with ordered as (
    select id, row_number() over (order by sort, lower(title), id) as rn
      from public.wiki_pages where parent_id is not distinct from pg.parent_id
  )
  update public.wiki_pages p set sort = ordered.rn from ordered where ordered.id = p.id and p.sort <> ordered.rn;
  select sort into v_at from public.wiki_pages where id = pg.id;
  select count(*) into v_n from public.wiki_pages where parent_id is not distinct from pg.parent_id;
  if (coalesce(p_dir, 0) < 0 and v_at <= 1) or (coalesce(p_dir, 0) >= 0 and v_at >= v_n) then
    return jsonb_build_object('ok', true, 'unchanged', true);
  end if;
  select id into v_other from public.wiki_pages
   where parent_id is not distinct from pg.parent_id and sort = v_at + (case when coalesce(p_dir, 0) < 0 then -1 else 1 end);
  update public.wiki_pages set sort = v_at + (case when coalesce(p_dir, 0) < 0 then -1 else 1 end) where id = pg.id;
  update public.wiki_pages set sort = v_at where id = v_other;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_wiki_move_page(bigint, int) from public, anon;
grant execute on function public.cr_wiki_move_page(bigint, int) to authenticated;
