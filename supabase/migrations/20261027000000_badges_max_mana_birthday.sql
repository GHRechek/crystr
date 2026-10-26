-- Three kinds of badge, each worth max mana; a birthday on the registry; 40 to start.
--
-- NOT APPLIED YET. Apply it in one go with the Supabase SQL editor (Dashboard -> SQL
-- Editor) or the migration tool, after the app that goes with it is deployed. Every
-- function it replaces keeps its old arguments (cr_register gains one with a default),
-- so an app from before this file keeps working against a database that has it.
--
-- MAX MANA. Until now the well stopped at a flat 60 for everyone. Now each person has
-- their own ceiling, profiles.mana_cap: 10 until they have registered, then 40, plus
-- what their badges carry:
--
--   * an ACHIEVEMENT badge (the eight that were already here)   +1 each
--   * a TRADABLE badge                                            +2 each
--   * a TOKEN (someone's own badge, given to you)                +10 each
--
-- cr_recount_cap(user) works that sum out and writes it; triggers on user_badges and
-- badge_items call it, so no code path can forget. The old cap_unregistered_mana trigger
-- becomes cap_mana, which keeps mana at or under the cap on every write. Quests, the
-- timer and the weekly trickle read the cap instead of 60.
--
-- TRADABLE badges are earned by helping: every five confirmed "I helped them" vouches
-- mints one, drawn at random from badge_kinds. Each is a row in badge_items, with an
-- owner that can change hands. badge_items.earned_by remembers who it was minted for,
-- so trading one away does not earn you another.
--
-- TOKENS: each person designs one (tokens.design: a badge shape in two colours and two
-- items layered on it, flipped, turned or sized, all chosen in the app; the database
-- keeps the JSON and the app reads it back). Giving it mints a copy (a badge_items row, kind 'token', with
-- the design as it was that day and the name "<First name>'s Token") for the other
-- person. One gift every six months.
--
-- TRADES (badge_trades): one person offers another a badge of theirs (or their token)
-- for one of the other's, or for nothing. The other accepts or declines; the offerer can
-- take it back. Accepting moves the rows in one transaction and recounts both caps.
-- Nothing here is written by the client: SELECT policies only, and the definer
-- functions below.
--
-- BIRTHDAY: profiles.birthday, a date between the years 1026 and 2026, asked on the
-- welcome page and kept with the registry answers. The welcome page also asks for the
-- person's own name now (p_name), which goes only into plaintiff_forms, where witches
-- can read it; the character's name stays profiles.display_name.

-- ------------------------------------------------------------------ birthday

alter table public.profiles add column if not exists birthday date;
alter table public.profiles drop constraint if exists profiles_birthday_range;
alter table public.profiles add constraint profiles_birthday_range
  check (birthday is null or (birthday >= date '1026-01-01' and birthday <= date '2026-12-31'));

-- --------------------------------------------------------------- max mana

alter table public.profiles add column if not exists mana_cap integer not null default 10;

-- The cap is ours to set, not the client's (same guard as mana and witch status).
create or replace function public.guard_profile_economy()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('crystr.economy', true), '') <> 'on' then
    new.mana        := old.mana;
    new.spent_total := old.spent_total;
    new.is_witch    := old.is_witch;
    new.onboarded   := old.onboarded;
    new.mana_cap    := old.mana_cap;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------- the badge tables

-- What a tradable badge can be. Art lives under /badges/tradable/ (public/badges/tradable).
create table if not exists public.badge_kinds (
  slug   text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title  text not null,
  blurb  text not null,
  art    text not null,
  sort   int  not null default 0,
  active boolean not null default true
);

-- One badge somebody holds. 'tradable' rows point at a kind; 'token' rows carry the
-- maker's design and name as they were when given.
create table if not exists public.badge_items (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('tradable', 'token')),
  kind_slug   text references public.badge_kinds (slug),
  -- Who earned it (tradable) or whose token it is. Survives trades.
  earned_by   uuid references public.profiles (id) on delete set null,
  title       text,
  design      jsonb,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  minted_at   timestamptz not null default now(),
  acquired_at timestamptz not null default now(),
  -- False until the holder has been told it is theirs.
  seen        boolean not null default false,
  check ((kind = 'tradable' and kind_slug is not null)
      or (kind = 'token' and kind_slug is null and design is not null and title is not null))
);
create index if not exists badge_items_owner_idx on public.badge_items (owner_id, kind);
create index if not exists badge_items_earned_idx on public.badge_items (earned_by, kind);

-- Each person's own token, and when they last gave it.
create table if not exists public.tokens (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  design        jsonb not null check (jsonb_typeof(design) = 'object' and pg_column_size(design) <= 2048),
  updated_at    timestamptz not null default now(),
  last_given_at timestamptz
);

-- An offer: what I give (one of my badges, or my token) for what I want (one of yours,
-- or nothing). Pending until you answer or I take it back.
create table if not exists public.badge_trades (
  id          bigint generated always as identity primary key,
  from_user   uuid not null references public.profiles (id) on delete cascade,
  to_user     uuid not null references public.profiles (id) on delete cascade,
  give_item   bigint references public.badge_items (id) on delete cascade,
  give_token  boolean not null default false,
  want_item   bigint references public.badge_items (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  check (from_user <> to_user),
  check (give_item is not null or give_token),
  check (not (give_item is not null and give_token))
);
create index if not exists badge_trades_to_idx on public.badge_trades (to_user, status);
create index if not exists badge_trades_from_idx on public.badge_trades (from_user, status);
-- One waiting offer per pair, in each direction.
create unique index if not exists badge_trades_pending_idx
  on public.badge_trades (from_user, to_user) where status = 'pending';

alter table public.badge_kinds  enable row level security;
alter table public.badge_items  enable row level security;
alter table public.tokens       enable row level security;
alter table public.badge_trades enable row level security;

revoke all on public.badge_kinds, public.badge_items, public.tokens, public.badge_trades from anon, authenticated;
grant select on public.badge_kinds, public.badge_items, public.tokens, public.badge_trades to authenticated;

drop policy if exists badge_kinds_read on public.badge_kinds;
create policy badge_kinds_read on public.badge_kinds for select to authenticated using (active);
-- Badges are recognition: anyone signed in can see who holds what.
drop policy if exists badge_items_read on public.badge_items;
create policy badge_items_read on public.badge_items for select to authenticated using (true);
-- A token's design is shown on its maker's page, so anyone signed in can read it.
drop policy if exists tokens_read on public.tokens;
create policy tokens_read on public.tokens for select to authenticated using (true);
drop policy if exists badge_trades_read on public.badge_trades;
create policy badge_trades_read on public.badge_trades for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

insert into public.badge_kinds (slug, title, blurb, art, sort) values
  ('raw-ore',        'RAW ORE',         'A lump of something worth smelting.',        'raw-ore.png', 1),
  ('gold-nugget',    'GOLD NUGGET',     'Heavier than it looks.',                     'gold-nugget.png', 2),
  ('ruby',           'RUBY',            'Red all the way through.',                   'ruby.png', 3),
  ('sapphire',       'SAPPHIRE',        'Blue as the deep Gate water.',               'sapphire.png', 4),
  ('timber',         'TIMBER',          'Cut, stacked and dry.',                      'timber.png', 5),
  ('tanned-hide',    'TANNED HIDE',     'Soft, and it smells of smoke.',              'tanned-hide.png', 6),
  ('parchment',      'PARCHMENT',       'Blank, for now.',                            'parchment.png', 7),
  ('quill-and-ink',  'QUILL AND INK',   'For saying it properly.',                    'quill-and-ink.png', 8),
  ('clear-flask',    'CLEAR FLASK',     'Stoppered. Nobody knows what was in it.',    'clear-flask.png', 9),
  ('lockpicks',      'LOCKPICKS',       'Not that you would.',                        'lockpicks.png', 10),
  ('short-sword',    'SHORT SWORD',     'Plain, sharp, honest.',                      'short-sword.png', 11),
  ('mace',           'MACE',            'Makes its point.',                           'mace.png', 12),
  ('flail',          'FLAIL',           'Keep it away from the lamps.',               'flail.png', 13),
  ('warhammer',      'WARHAMMER',       'Heavy enough to settle things.',             'warhammer.png', 14),
  ('battleaxe',      'BATTLEAXE',       'Two edges, one argument.',                   'battleaxe.png', 15),
  ('scythe',         'SCYTHE',          'For the harvest, mostly.',                   'scythe.png', 16),
  ('spear',          'SPEAR',           'Reach is everything.',                       'spear.png', 17),
  ('crossbow',       'CROSSBOW',        'Wound and waiting.',                         'crossbow.png', 18),
  ('hook-and-line',  'HOOK AND LINE',   'Patience, coiled.',                          'hook-and-line.png', 19),
  ('shovel',         'SHOVEL',          'Ask no questions.',                          'shovel.png', 20),
  ('wizards-staff',  'WIZARD''S STAFF', 'Hums when it rains.',                        'wizards-staff.png', 21),
  ('star-wand',      'STAR WAND',       'It sparks. That is all it does.',            'star-wand.png', 22),
  ('green-tonic',    'GREEN TONIC',     'Tastes like a hedge. Works.',                'green-tonic.png', 23),
  ('runestone',      'RUNESTONE',       'One rune, worn smooth.',                     'runestone.png', 24),
  ('crystal-ball',   'CRYSTAL BALL',    'Shows you what you already thought.',        'crystal-ball.png', 25),
  ('heart-locket',   'HEART LOCKET',    'Something small inside.',                    'heart-locket.png', 26),
  ('silver-ring',    'SILVER RING',     'Fits somebody.',                             'silver-ring.png', 27),
  ('blue-potion',    'BLUE POTION',     'Cold going down.',                           'blue-potion.png', 28),
  ('red-potion',     'RED POTION',      'Warm going down.',                           'red-potion.png', 29),
  ('sealed-scroll',  'SEALED SCROLL',   'The wax is still whole.',                    'sealed-scroll.png', 30),
  ('dragon-crest',   'DRAGON CREST',    'An old house, loud about it.',               'dragon-crest.png', 31),
  ('serpent-crest',  'SERPENT CREST',   'A quiet house.',                             'serpent-crest.png', 32),
  ('spider-crest',   'SPIDER CREST',    'Patient, and everywhere.',                   'spider-crest.png', 33),
  ('scorpion-crest', 'SCORPION CREST',  'Best not stepped on.',                       'scorpion-crest.png', 34),
  ('bat-banner',     'BAT BANNER',      'Flown at dusk.',                             'bat-banner.png', 35),
  ('owl-crest',      'OWL CREST',       'Sees what you did.',                         'owl-crest.png', 36),
  ('stag-crest',     'STAG CREST',      'The Outlands'' own.',                        'stag-crest.png', 37),
  ('locked-chest',   'LOCKED CHEST',    'No key came with it.',                       'locked-chest.png', 38),
  ('bull-crest',     'BULL CREST',      'Head down, straight on.',                    'bull-crest.png', 39),
  ('sun-disc',       'SUN DISC',        'Warm in the hand, always.',                  'sun-disc.png', 40),
  ('old-map',        'OLD MAP',         'Half of it is wrong.',                       'old-map.png', 41),
  ('golden-egg',     'GOLDEN EGG',      'Do not ask what laid it.',                   'golden-egg.png', 42),
  ('bone-claw',      'BONE CLAW',       'From something large.',                      'bone-claw.png', 43),
  ('hourglass',      'HOURGLASS',       'Turn it and wait.',                          'hourglass.png', 44),
  ('bedroll',        'BEDROLL',         'Everywhere is home.',                        'bedroll.png', 45),
  ('fishing-rod',    'FISHING ROD',     'Dinner, if you are lucky.',                  'fishing-rod.png', 46),
  ('beating-heart',  'BEATING HEART',   'Still going.',                               'beating-heart.png', 47),
  ('old-skull',      'OLD SKULL',       'It was somebody.',                           'old-skull.png', 48)
on conflict (slug) do update set title = excluded.title, blurb = excluded.blurb, art = excluded.art, sort = excluded.sort;

-- ------------------------------------------------------------ the ceiling

-- What this person can hold, written to their row. Mana above it is brought down to it.
create or replace function public.cr_recount_cap(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_cap int;
begin
  select onboarded into v_on from public.profiles where id = p_user;
  if not found then return null; end if;
  if not v_on then
    v_cap := 10;
  else
    v_cap := 40
      + (select count(*) from public.user_badges where user_id = p_user)
      + (select coalesce(sum(case kind when 'tradable' then 2 when 'token' then 10 else 0 end), 0)
           from public.badge_items where owner_id = p_user);
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set mana_cap = v_cap, mana = least(mana, v_cap), updated_at = now()
   where id = p_user and (mana_cap <> v_cap or mana > v_cap);
  return v_cap;
end;
$$;
revoke all on function public.cr_recount_cap(uuid) from public, anon, authenticated;

-- Keeps every write inside the ceiling. Runs last (the zz_), after the economy guard.
create or replace function public.cap_mana()
returns trigger language plpgsql set search_path = public as $$
begin
  if not new.onboarded then new.mana_cap := 10; end if;
  if new.mana > new.mana_cap then new.mana := new.mana_cap; end if;
  return new;
end;
$$;
drop trigger if exists zz_cap_unregistered_mana on public.profiles;
drop function if exists public.cap_unregistered_mana();
drop trigger if exists zz_cap_mana on public.profiles;
create trigger zz_cap_mana
  before insert or update of mana, onboarded, mana_cap on public.profiles
  for each row execute function public.cap_mana();

create or replace function public.trg_recount_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Badge rows name their person as user_id (achievements) or owner_id (items); a move
  -- between owners recounts both.
  if tg_table_name = 'user_badges' then
    perform public.cr_recount_cap(case when tg_op = 'DELETE' then old.user_id else new.user_id end);
  else
    if tg_op in ('UPDATE', 'DELETE') then perform public.cr_recount_cap(old.owner_id); end if;
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.owner_id <> old.owner_id) then
      perform public.cr_recount_cap(new.owner_id);
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.trg_recount_cap() from public, anon, authenticated;
drop trigger if exists recount_cap_user_badges on public.user_badges;
create trigger recount_cap_user_badges after insert or delete on public.user_badges
  for each row execute function public.trg_recount_cap();
drop trigger if exists recount_cap_badge_items on public.badge_items;
create trigger recount_cap_badge_items after insert or update of owner_id or delete on public.badge_items
  for each row execute function public.trg_recount_cap();

-- Everyone already here gets their ceiling worked out now, then the range check can hold.
do $$ declare u record; begin
  for u in select id from public.profiles loop perform public.cr_recount_cap(u.id); end loop;
end $$;
alter table public.profiles drop constraint if exists profiles_mana_range;
alter table public.profiles add constraint profiles_mana_range check (mana >= 0 and mana <= mana_cap);

-- ------------------------------------------------- the well reads the cap

create or replace function public.cr_start_quest_timer(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype; v_last timestamptz; v_mana int; v_cap int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select * into q from public.quests where slug = p_slug and active and timer_seconds is not null;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  select mana, mana_cap into v_mana, v_cap from public.profiles where id = auth.uid();
  if v_mana >= v_cap then return jsonb_build_object('ok', false, 'code', 'full'); end if;

  select max(created_at) into v_last from public.quest_submissions
   where user_id = auth.uid() and quest_slug = p_slug and status <> 'void';
  if v_last is not null and v_last > now() - make_interval(hours => q.cooldown_hours) then
    return jsonb_build_object('ok', false, 'code', 'cooldown',
      'ready_at', v_last + make_interval(hours => q.cooldown_hours));
  end if;

  insert into public.quest_timers (user_id, quest_slug, started_at)
  values (auth.uid(), p_slug, now())
  on conflict (user_id, quest_slug) do update set started_at = excluded.started_at;
  return jsonb_build_object('ok', true, 'seconds', q.timer_seconds);
end;
$$;

create or replace function public.cr_submit_quest(p_slug text, p_note text default null, p_proof_url text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype;
        v_last timestamptz;
        v_old  int;
        v_cap  int;
        v_new  int;
        v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_proof text := nullif(btrim(coalesce(p_proof_url, '')), '');
        v_timer timestamptz;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  select * into q from public.quests where slug = p_slug and active;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  select mana, mana_cap into v_old, v_cap from public.profiles where id = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  if q.timer_seconds is not null then
    select started_at into v_timer from public.quest_timers
     where user_id = auth.uid() and quest_slug = p_slug;
    if v_timer is null or v_timer < now() - interval '30 minutes' then
      return jsonb_build_object('ok', false, 'code', 'no_timer');
    end if;
    if v_timer > now() - make_interval(secs => q.timer_seconds) then
      return jsonb_build_object('ok', false, 'code', 'too_soon');
    end if;
  elsif q.proof_required then
    -- A picture is the whole point: it must be a real file this person uploaded.
    if v_proof is null or not exists (
         select 1 from storage.objects
          where bucket_id = 'proofs' and name = v_proof
            and (storage.foldername(name))[1] = auth.uid()::text) then
      return jsonb_build_object('ok', false, 'code', 'no_proof');
    end if;
  elsif v_proof is null and char_length(coalesce(v_note, '')) < 12 then
    return jsonb_build_object('ok', false, 'code', 'no_proof');
  end if;

  select max(created_at) into v_last
    from public.quest_submissions
   where user_id = auth.uid() and quest_slug = p_slug and status <> 'void';

  if v_last is not null and v_last > now() - make_interval(hours => q.cooldown_hours) then
    return jsonb_build_object('ok', false, 'code', 'cooldown',
      'ready_at', v_last + make_interval(hours => q.cooldown_hours));
  end if;

  if q.timer_seconds is null and not q.proof_required and v_note is not null and exists (
       select 1 from public.quest_submissions s
        where s.user_id = auth.uid() and s.status <> 'void' and lower(s.note) = lower(v_note)) then
    return jsonb_build_object('ok', false, 'code', 'repeat');
  end if;

  if v_old >= v_cap then return jsonb_build_object('ok', false, 'code', 'full'); end if;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set mana = least(mana_cap, mana + q.reward), updated_at = now()
   where id = auth.uid()
  returning mana into v_new;

  insert into public.mana_ledger (user_id, amount, reason, kind)
  values (auth.uid(), v_new - v_old, q.title || ' — accepted', 'quest');

  insert into public.quest_submissions (user_id, quest_slug, note, proof_url, reward)
  values (auth.uid(), p_slug, v_note, v_proof, v_new - v_old);

  if q.timer_seconds is not null then
    update public.quest_timers set started_at = null where user_id = auth.uid() and quest_slug = p_slug;
  end if;

  return jsonb_build_object('ok', true, 'reward', v_new - v_old, 'mana', v_new);
end;
$$;

create or replace function public.cr_weekly_trickle()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform set_config('crystr.economy', 'on', true);
  with up as (
    update public.profiles set mana = mana + 1, updated_at = now()
     where mana < mana_cap
    returning id
  ), led as (
    insert into public.mana_ledger (user_id, amount, reason, kind)
    select id, 1, 'A little time passes', 'trickle' from up
    returning 1
  )
  select count(*) into n from led;
  return n;
end;
$$;

-- --------------------------------------------- registering, with a birthday

drop function if exists public.cr_register(text, text, text, text);
create or replace function public.cr_register(
  p_district text, p_district_code text, p_species text, p_species_code text,
  p_birthday date default null, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
        v_name text;
        v_character text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if p_district not in ('city', 'outland', 'gate')
     or p_species not in ('orc', 'elf', 'human', 'shifter', 'planar')
     or char_length(btrim(coalesce(p_district_code, ''))) = 0
     or char_length(btrim(coalesce(p_species_code, ''))) = 0
     or char_length(p_district_code) > 24 or char_length(p_species_code) > 24 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;
  if p_birthday is not null and (p_birthday < date '1026-01-01' or p_birthday > date '2026-12-31') then
    return jsonb_build_object('ok', false, 'code', 'bad_birthday');
  end if;
  if char_length(coalesce(p_name, '')) > 120 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'adc' and key = p_district
                    and position(lower(code) in lower(p_district_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_adc'); end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'sdc' and key = p_species
                    and position(lower(code) in lower(p_species_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_sdc'); end if;

  -- The character's name is public (display_name); the person's own name goes only here,
  -- where witches can read it.
  select coalesce(nullif(btrim(display_name), ''), handle) into v_character from public.profiles where id = auth.uid();
  v_name := coalesce(nullif(btrim(p_name), ''), v_character);

  insert into public.plaintiffs (user_id) values (auth.uid()) on conflict do nothing;
  insert into public.plaintiff_forms (user_id, answers)
  values (auth.uid(), jsonb_build_object(
    'name', v_name, 'character', v_character, 'district', p_district, 'species', p_species, 'birthday', p_birthday))
  on conflict (user_id) do nothing;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set onboarded = true, birthday = coalesce(p_birthday, birthday), updated_at = now()
   where id = auth.uid();
  perform public.cr_recount_cap(auth.uid());
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_register(text, text, text, text, date, text) from public, anon;
grant execute on function public.cr_register(text, text, text, text, date, text) to authenticated;

-- ------------------------------------------- earning: achievements, then helps

-- Same rules as before for the eight achievement badges, then one tradable badge for
-- every five confirmed helps that has not been minted yet.
create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_helped int; v_minted int; v_kind text;
begin
  for b in select slug from public.badges where active loop
    if exists (select 1 from public.user_badges where user_id = p_user and badge_slug = b.slug) then
      continue;
    end if;

    ok := case b.slug
      when 'first-words' then
        exists (select 1 from public.posts where author_id = p_user and parent_id is null)
      when 'show-and-tell' then
        exists (select 1 from public.posts where author_id = p_user and has_image
                  and (image_url is not null or proof_path is not null))
      when 'joined-in' then
        (select count(distinct r.parent_id)
           from public.posts r
           join public.posts root on root.id = r.parent_id
          where r.author_id = p_user and r.parent_id is not null
            and root.author_id <> p_user) >= 5
      when 'whisper-web' then
        (select count(distinct case when t.user_a = p_user then t.user_b else t.user_a end)
           from public.dm_threads t
          where (t.user_a = p_user or t.user_b = p_user)
            and exists (select 1 from public.dm_messages m
                         where m.thread_id = t.id and m.sender_id = p_user)) >= 5
      when 'a-voice-in-council' then
        (select count(*) from public.motion_votes where user_id = p_user) >= 10
      when 'meet-in-person' then
        exists (select 1 from public.vouches
                 where kind = 'meetup' and status = 'confirmed'
                   and (claimant = p_user or other = p_user))
      when 'a-helping-hand' then
        exists (select 1 from public.vouches
                 where kind = 'helped' and status = 'confirmed' and claimant = p_user)
      when 'registered-plaintiff' then
        exists (select 1 from public.plaintiffs where user_id = p_user)
      else false
    end;

    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug)
        on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  -- Every five helps, a tradable badge, drawn at random. Counted against what was ever
  -- minted for this person, so giving one away does not bring it back.
  select count(*) into v_helped from public.vouches
   where kind = 'helped' and status = 'confirmed' and claimant = p_user;
  select count(*) into v_minted from public.badge_items
   where kind = 'tradable' and earned_by = p_user;
  while v_minted < v_helped / 5 loop
    select slug into v_kind from public.badge_kinds where active order by random() limit 1;
    exit when v_kind is null;
    insert into public.badge_items (kind, kind_slug, earned_by, owner_id)
    values ('tradable', v_kind, p_user, p_user);
    v_minted := v_minted + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Tell the person what they have earned or been given since they last heard, once.
create or replace function public.cr_claim_new_badges()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  with t as (
    update public.user_badges set seen = true
     where user_id = auth.uid() and not seen
    returning badge_slug
  ), i as (
    update public.badge_items set seen = true
     where owner_id = auth.uid() and not seen
    returning id, kind, kind_slug, title
  ), named as (
    select b.slug, b.title, b.blurb, b.sort, 0 as grp from t join public.badges b on b.slug = t.badge_slug
    union all
    select coalesce(k.slug, 'token-' || i.id::text),
           case when i.kind = 'tradable' then k.title else i.title end,
           case when i.kind = 'tradable' then k.blurb else 'Their own token, given to you.' end,
           coalesce(k.sort, 0),
           case when i.kind = 'tradable' then 1 else 2 end
      from i left join public.badge_kinds k on k.slug = i.kind_slug
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'blurb', blurb) order by grp, sort), '[]'::jsonb)
    into r from named;
  return r;
end;
$$;

-- ---------------------------------------------------------------- the token

-- Design (or redesign) your token. The app decides what the JSON means and reads it back;
-- the database keeps it small and an object.
create or replace function public.cr_set_token(p_design jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_design is null or jsonb_typeof(p_design) <> 'object' or pg_column_size(p_design) > 2048 then
    return jsonb_build_object('ok', false, 'code', 'bad_design');
  end if;
  insert into public.tokens (user_id, design) values (auth.uid(), p_design)
  on conflict (user_id) do update set design = excluded.design, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_set_token(jsonb) from public, anon;
grant execute on function public.cr_set_token(jsonb) to authenticated;

-- What a token given by this person is called: the first word of their display name
-- (their handle if they have none), then "'s Token".
create or replace function public.token_title(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select split_part(coalesce(nullif(btrim(display_name), ''), handle), ' ', 1) || '''s Token'
    from public.profiles where id = p_user;
$$;
revoke all on function public.token_title(uuid) from public, anon, authenticated;

-- When this person may next give their token (null: now).
create or replace function public.token_ready_at(p_user uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select case when last_given_at is null then null else last_given_at + interval '6 months' end
    from public.tokens where user_id = p_user;
$$;
revoke all on function public.token_ready_at(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------ trades

-- Offer: one of my badges (p_give), or my token (p_give_token), for one of theirs
-- (p_want) or for nothing. Codes: bad_person, not_yours, not_theirs, no_design,
-- too_soon (ready_at says when), own_token (their own token back to them), already.
create or replace function public.cr_offer_trade(p_to uuid, p_give bigint, p_give_token boolean, p_want bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_give public.badge_items%rowtype; v_want public.badge_items%rowtype; v_ready timestamptz; v_id bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_to is null or p_to = auth.uid() or not exists (select 1 from public.profiles where id = p_to and onboarded) then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  if (p_give is null and not coalesce(p_give_token, false))
     or (p_give is not null and coalesce(p_give_token, false)) then
    return jsonb_build_object('ok', false, 'code', 'nothing');
  end if;

  if p_give is not null then
    select * into v_give from public.badge_items where id = p_give;
    if not found or v_give.owner_id <> auth.uid() then return jsonb_build_object('ok', false, 'code', 'not_yours'); end if;
    if v_give.kind = 'token' and v_give.earned_by = p_to then return jsonb_build_object('ok', false, 'code', 'own_token'); end if;
  end if;
  if coalesce(p_give_token, false) then
    if not exists (select 1 from public.tokens where user_id = auth.uid()) then
      return jsonb_build_object('ok', false, 'code', 'no_design');
    end if;
    v_ready := public.token_ready_at(auth.uid());
    if v_ready is not null and v_ready > now() then
      return jsonb_build_object('ok', false, 'code', 'too_soon', 'ready_at', v_ready);
    end if;
    if exists (select 1 from public.badge_trades where from_user = auth.uid() and give_token and status = 'pending') then
      return jsonb_build_object('ok', false, 'code', 'already');
    end if;
  end if;
  if p_want is not null then
    select * into v_want from public.badge_items where id = p_want;
    if not found or v_want.owner_id <> p_to then return jsonb_build_object('ok', false, 'code', 'not_theirs'); end if;
    if v_want.kind = 'token' and v_want.earned_by = auth.uid() then return jsonb_build_object('ok', false, 'code', 'own_token'); end if;
  end if;
  if exists (select 1 from public.badge_trades where from_user = auth.uid() and to_user = p_to and status = 'pending') then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;

  insert into public.badge_trades (from_user, to_user, give_item, give_token, want_item)
  values (auth.uid(), p_to, p_give, coalesce(p_give_token, false), p_want)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.cr_offer_trade(uuid, bigint, boolean, bigint) from public, anon;
grant execute on function public.cr_offer_trade(uuid, bigint, boolean, bigint) to authenticated;

-- The other person answers. Yes moves the badges, in one transaction, and recounts both
-- ceilings (the triggers do that). A badge that has moved on since the offer, or a
-- token given elsewhere in the meantime, makes the offer 'stale' and cancels it.
create or replace function public.cr_answer_trade(p_id bigint, p_yes boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.badge_trades%rowtype; v_tok public.tokens%rowtype; v_ready timestamptz; v_new bigint;
begin
  select * into t from public.badge_trades where id = p_id for update;
  if not found or t.to_user <> auth.uid() or t.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if not p_yes then
    update public.badge_trades set status = 'declined', answered_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'yes', false);
  end if;

  -- Still as offered?
  if (t.give_item is not null and not exists (select 1 from public.badge_items where id = t.give_item and owner_id = t.from_user))
     or (t.want_item is not null and not exists (select 1 from public.badge_items where id = t.want_item and owner_id = t.to_user)) then
    update public.badge_trades set status = 'cancelled', answered_at = now() where id = p_id;
    return jsonb_build_object('ok', false, 'code', 'stale');
  end if;
  if t.give_token then
    select * into v_tok from public.tokens where user_id = t.from_user for update;
    v_ready := public.token_ready_at(t.from_user);
    if v_tok.user_id is null or (v_ready is not null and v_ready > now()) then
      update public.badge_trades set status = 'cancelled', answered_at = now() where id = p_id;
      return jsonb_build_object('ok', false, 'code', 'stale');
    end if;
  end if;

  perform set_config('crystr.economy', 'on', true);
  if t.give_item is not null then
    update public.badge_items set owner_id = t.to_user, acquired_at = now(), seen = true where id = t.give_item;
  end if;
  if t.want_item is not null then
    update public.badge_items set owner_id = t.from_user, acquired_at = now(), seen = false where id = t.want_item;
  end if;
  if t.give_token then
    insert into public.badge_items (kind, earned_by, title, design, owner_id, seen)
    values ('token', t.from_user, public.token_title(t.from_user), v_tok.design, t.to_user, true)
    returning id into v_new;
    update public.tokens set last_given_at = now() where user_id = t.from_user;
  end if;
  update public.badge_trades set status = 'accepted', answered_at = now() where id = p_id;

  -- Other offers that counted on a badge that has just moved are no longer true.
  update public.badge_trades set status = 'cancelled', answered_at = now()
   where status = 'pending' and id <> p_id
     and (give_item in (t.give_item, t.want_item) or want_item in (t.give_item, t.want_item)
          or (give_token and from_user = t.from_user and t.give_token));

  return jsonb_build_object('ok', true, 'yes', true, 'id', v_new);
end;
$$;
revoke all on function public.cr_answer_trade(bigint, boolean) from public, anon;
grant execute on function public.cr_answer_trade(bigint, boolean) to authenticated;

-- The offerer thinks better of it.
create or replace function public.cr_cancel_trade(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.badge_trades set status = 'cancelled', answered_at = now()
   where id = p_id and from_user = auth.uid() and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_cancel_trade(bigint) from public, anon;
grant execute on function public.cr_cancel_trade(bigint) to authenticated;

-- People who have already helped five times get their badges now, without an announcement.
do $$ declare u record; begin
  for u in select distinct claimant as id from public.vouches where kind = 'helped' and status = 'confirmed' loop
    perform public.award_badges(u.id);
  end loop;
  update public.badge_items set seen = true;
end $$;
