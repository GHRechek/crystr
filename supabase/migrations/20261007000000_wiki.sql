-- The wiki: a page is a list of facts about a thing, written a few words at a
-- time by whoever walks past.
--
-- Applied to the live database on 2026-10-14. The tool that applied it chokes on
-- literal backslashes, so this file uses [[:space:]] and a chr(10)/chr(13) check
-- where it once had \s and [\r\n]; they mean the same thing.
--
-- The shape: a witch starts a page (a title and some number of open slots). The
-- page shows the facts the City has added, one per slot, with illegible filler
-- text between them (that part is purely a screen thing). Anyone signed in can
-- add a handful of words to an open slot. Until a witch has read it, a new fact
-- is visible only to its writer and to witches. Witches keep, reword or send
-- back what is added, lock or archive pages, and can take a kept fact down.
--
-- Reading is free. Adding a fact costs 2 mana (a witch's goes straight on the page; everyone else's waits for a witch), charged by cr_wiki_add_fact (and
-- COSTS.wikiEdit in lib/crystr.ts, which is only for display). Rewording your own
-- fact while it is still waiting is free. Starting a page and moderating cost
-- nothing.

-- The ledger lists what it will accept; add the wiki to it.
alter table public.mana_ledger drop constraint if exists mana_ledger_kind_check;
alter table public.mana_ledger add constraint mana_ledger_kind_check
  check (kind = any (array['grant','post','like','whisper','vote','oped','quest','top8','top6','wiki']));

create table if not exists public.wiki_pages (
  id         bigint generated always as identity primary key,
  slug       text not null unique
             check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title      text not null check (char_length(btrim(title)) between 1 and 120),
  -- How many slots the page has. There are always at least two open: keeping a
  -- fact adds slots as needed, so a page never fills up.
  slots      int  not null default 6 check (slots between 1 and 300),
  -- A witch can lock a page: only witches may add to it.
  locked     boolean not null default false,
  -- An archived page is hidden from everyone but witches; never hard-deleted.
  archived   boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- One fact in one slot: a handful of words.
create table if not exists public.wiki_facts (
  id          bigint generated always as identity primary key,
  page_id     bigint not null references public.wiki_pages (id) on delete cascade,
  slot        int    not null check (slot >= 1),
  body        text   not null check (char_length(btrim(body)) between 1 and 80),
  author      uuid   not null references public.profiles (id),
  status      text   not null default 'pending' check (status in ('pending', 'kept', 'returned')),
  note        text   not null default '',
  created_at  timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  constraint wiki_facts_one_line check (position(chr(10) in body) = 0 and position(chr(13) in body) = 0)
);
-- One kept fact per slot; one waiting fact per person per slot.
create unique index if not exists wiki_facts_kept_idx    on public.wiki_facts (page_id, slot) where status = 'kept';
create unique index if not exists wiki_facts_pending_idx on public.wiki_facts (page_id, slot, author) where status = 'pending';
create index if not exists wiki_facts_page_idx on public.wiki_facts (page_id, status, slot);

alter table public.wiki_pages enable row level security;
alter table public.wiki_facts enable row level security;

-- Say what we mean instead of leaning on RLS alone: read, and nothing else.
revoke all on public.wiki_pages, public.wiki_facts from anon, authenticated;
grant select on public.wiki_pages, public.wiki_facts to authenticated;

drop policy if exists wiki_pages_read on public.wiki_pages;
create policy wiki_pages_read on public.wiki_pages
  for select to authenticated using (not archived or public.is_witch());

-- Kept facts are the page, so everyone reads them. A fact still waiting, or
-- sent back, is only for its writer and for witches.
drop policy if exists wiki_facts_read on public.wiki_facts;
create policy wiki_facts_read on public.wiki_facts
  for select to authenticated using (
    exists (select 1 from public.wiki_pages p
             where p.id = page_id and (not p.archived or public.is_witch()))
    and (status = 'kept' or author = auth.uid() or public.is_witch())
  );

-- A witch starts a page.
create or replace function public.cr_wiki_create_page(p_slug text, p_title text, p_slots int default 6)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_slug text := lower(btrim(p_slug));
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if char_length(btrim(coalesce(p_title, ''))) = 0 then
    return jsonb_build_object('ok', false, 'code', 'no_title');
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 60 then
    return jsonb_build_object('ok', false, 'code', 'bad_slug');
  end if;
  -- "new" and "to-read" are screens, not pages.
  if v_slug in ('new', 'to-read') or exists (select 1 from public.wiki_pages where slug = v_slug) then
    return jsonb_build_object('ok', false, 'code', 'taken');
  end if;

  insert into public.wiki_pages (slug, title, slots, created_by, updated_by)
  values (v_slug, btrim(p_title), greatest(2, least(coalesce(p_slots, 6), 300)), auth.uid(), auth.uid())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'slug', v_slug);
end;
$$;

-- Anyone signed in adds a handful of words to an open slot. Costs v_cost,
-- charged before anything is written. Rewording your own waiting fact for the
-- same slot replaces it, for nothing. A slot that already has a kept fact is
-- settled.
--
-- A witch needs no approval: what a witch adds is kept at once (and anyone else
-- who offered a fact for that spot is sent back, as when a witch keeps one). It
-- costs the same as for anyone, unless they are finishing a fact of their own
-- that was already waiting, which was already paid for.
create or replace function public.cr_wiki_add_fact(p_page bigint, p_slot int, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pg public.wiki_pages%rowtype;
        v_body text := btrim(regexp_replace(coalesce(p_body, ''), '[[:space:]]+', ' ', 'g'));
        v_cost int := 2;
        v_id bigint;
        v_open int;
        v_paid boolean := false;
begin
  select * into pg from public.wiki_pages where id = p_page;
  if not found or pg.archived or p_slot is null or p_slot < 1 or p_slot > pg.slots then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if pg.locked and not public.is_witch() then
    return jsonb_build_object('ok', false, 'code', 'locked');
  end if;
  if char_length(v_body) = 0 then return jsonb_build_object('ok', false, 'code', 'empty'); end if;
  -- A handful: up to 10 words, 80 characters.
  if char_length(v_body) > 80 or cardinality(regexp_split_to_array(v_body, ' ')) > 10 then
    return jsonb_build_object('ok', false, 'code', 'too_long');
  end if;
  if exists (select 1 from public.wiki_facts where page_id = p_page and slot = p_slot and status = 'kept') then
    return jsonb_build_object('ok', false, 'code', 'settled');
  end if;

  if public.is_witch() then
    update public.wiki_facts
       set body = v_body, status = 'kept', note = '', created_at = now(),
           reviewed_by = auth.uid(), reviewed_at = now()
     where page_id = p_page and slot = p_slot and author = auth.uid() and status = 'pending'
    returning id into v_id;
    if found then
      v_paid := true;
    else
      if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
      perform public.cr_take(v_cost, 'Wiki fact — ' || pg.title, 'wiki');
      insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
      values (p_page, p_slot, v_body, auth.uid(), 'kept', auth.uid(), now())
      returning id into v_id;
    end if;
    update public.wiki_facts
       set status = 'returned', note = 'A witch put a fact in this spot. Try one of the open ones.',
           reviewed_by = auth.uid(), reviewed_at = now()
     where page_id = p_page and slot = p_slot and status = 'pending';
    -- Always leave at least two open slots.
    select pg.slots - count(*) into v_open from public.wiki_facts where page_id = pg.id and status = 'kept';
    update public.wiki_pages
       set slots = least(300, slots + greatest(0, 2 - v_open)),
           updated_by = auth.uid(), updated_at = now()
     where id = pg.id;
    return jsonb_build_object('ok', true, 'id', v_id, 'kept', true,
                              'cost', case when v_paid then 0 else v_cost end, 'mana', public.cr_balance());
  end if;

  update public.wiki_facts set body = v_body, created_at = now()
   where page_id = p_page and slot = p_slot and author = auth.uid() and status = 'pending'
  returning id into v_id;
  if found then return jsonb_build_object('ok', true, 'id', v_id, 'reworded', true); end if;

  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Wiki fact — ' || pg.title, 'wiki');
  insert into public.wiki_facts (page_id, slot, body, author)
  values (p_page, p_slot, v_body, auth.uid()) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;

-- A witch reads a waiting fact: keep it (optionally in their own words) or send
-- it back with an optional note. Keeping one returns the others offered for the
-- same slot, and makes sure the page still has open slots to write into.
create or replace function public.cr_wiki_review_fact(p_fact bigint, p_keep boolean, p_body text default null, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare f public.wiki_facts%rowtype;
        pg public.wiki_pages%rowtype;
        v_text text;
        v_open int;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into f from public.wiki_facts where id = p_fact for update;
  if not found or f.status <> 'pending' then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  select * into pg from public.wiki_pages where id = f.page_id for update;

  if not p_keep then
    update public.wiki_facts set status = 'returned', note = left(btrim(coalesce(p_note, '')), 200),
           reviewed_by = auth.uid(), reviewed_at = now() where id = p_fact;
    return jsonb_build_object('ok', true, 'kept', false, 'slug', pg.slug);
  end if;

  v_text := btrim(regexp_replace(coalesce(nullif(btrim(coalesce(p_body, '')), ''), f.body), '[[:space:]]+', ' ', 'g'));
  if char_length(v_text) = 0 or char_length(v_text) > 80
     or cardinality(regexp_split_to_array(v_text, ' ')) > 10 then
    return jsonb_build_object('ok', false, 'code', 'too_long');
  end if;
  if exists (select 1 from public.wiki_facts where page_id = f.page_id and slot = f.slot and status = 'kept') then
    return jsonb_build_object('ok', false, 'code', 'settled');
  end if;

  update public.wiki_facts set status = 'kept', body = v_text, note = '',
         reviewed_by = auth.uid(), reviewed_at = now() where id = p_fact;
  update public.wiki_facts set status = 'returned', note = 'Another fact was kept for this slot. Try one of the open ones.',
         reviewed_by = auth.uid(), reviewed_at = now()
   where page_id = f.page_id and slot = f.slot and status = 'pending';

  -- Always leave at least two open slots.
  select pg.slots - count(*) into v_open from public.wiki_facts where page_id = pg.id and status = 'kept';
  update public.wiki_pages
     set slots = least(300, slots + greatest(0, 2 - v_open)),
         updated_by = auth.uid(), updated_at = now()
   where id = pg.id;
  return jsonb_build_object('ok', true, 'kept', true, 'slug', pg.slug);
end;
$$;

-- A witch takes a kept fact down. Its slot opens again.
create or replace function public.cr_wiki_remove_fact(p_fact bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f public.wiki_facts%rowtype; v_slug text;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into f from public.wiki_facts where id = p_fact for update;
  if not found or f.status <> 'kept' then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  update public.wiki_facts set status = 'returned', note = 'Taken down by a witch.',
         reviewed_by = auth.uid(), reviewed_at = now() where id = p_fact;
  update public.wiki_pages set updated_by = auth.uid(), updated_at = now()
   where id = f.page_id returning slug into v_slug;
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

-- Moderation: lock or unlock, archive or restore. Witches only.
create or replace function public.cr_wiki_moderate(p_id bigint, p_locked boolean, p_archived boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  update public.wiki_pages
     set locked = coalesce(p_locked, locked), archived = coalesce(p_archived, archived)
   where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cr_wiki_create_page(text, text, int) from public, anon;
revoke all on function public.cr_wiki_add_fact(bigint, int, text) from public, anon;
revoke all on function public.cr_wiki_review_fact(bigint, boolean, text, text) from public, anon;
revoke all on function public.cr_wiki_remove_fact(bigint) from public, anon;
revoke all on function public.cr_wiki_moderate(bigint, boolean, boolean) from public, anon;
grant execute on function public.cr_wiki_create_page(text, text, int) to authenticated;
grant execute on function public.cr_wiki_add_fact(bigint, int, text) to authenticated;
grant execute on function public.cr_wiki_review_fact(bigint, boolean, text, text) to authenticated;
grant execute on function public.cr_wiki_remove_fact(bigint) to authenticated;
grant execute on function public.cr_wiki_moderate(bigint, boolean, boolean) to authenticated;

-- When each person last opened each page, so their wiki list can put what they
-- opened most recently first. Their own record only: nobody sees anyone else's.
-- Applied 2026-10-14, after the rest of this file.
create table if not exists public.wiki_views (
  user_id   uuid   not null references public.profiles (id) on delete cascade,
  page_id   bigint not null references public.wiki_pages (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, page_id)
);
alter table public.wiki_views enable row level security;
revoke all on public.wiki_views from anon, authenticated;
grant select on public.wiki_views to authenticated;
drop policy if exists wiki_views_read on public.wiki_views;
create policy wiki_views_read on public.wiki_views for select to authenticated using (user_id = auth.uid());

-- Note that the caller opened a page. Archived pages are for witches only.
create or replace function public.cr_wiki_touch(p_page bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.wiki_pages where id = p_page and (not archived or public.is_witch())) then
    return;
  end if;
  insert into public.wiki_views (user_id, page_id, viewed_at) values (auth.uid(), p_page, now())
  on conflict (user_id, page_id) do update set viewed_at = now();
end;
$$;
revoke all on function public.cr_wiki_touch(bigint) from public, anon;
grant execute on function public.cr_wiki_touch(bigint) to authenticated;
