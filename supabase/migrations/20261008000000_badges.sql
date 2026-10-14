-- Badges: recognition, nothing more. They carry no mana and are never taken
-- back.
--
-- NOT APPLIED. Written for the feature/badges branch.
--
-- A badge is earned by doing something the app can already see. Awarding is
-- done by triggers on the tables the activity lands in (posts, whispers,
-- votes), so no code path can forget to check, and nobody can give themselves
-- one: user_badges has no write policy and only the definer function writes it.
--
-- Adding a badge later = one row in `badges` + one `when` branch in
-- award_badges below.
--
-- Registered Plaintiffs: people who have filled in Form 12-A, the City Office of
-- Civic Plaintiff Registration form. It used to be a Google Form; it is now a
-- form in the app (me/plaintiff), so each submission is tied to the signed-in
-- person. The form's code questions (ADC, SDC, petition series) are checked here,
-- against plaintiff_codes, which nothing but cr_submit_plaintiff can read: the
-- right answers must not live in the (public) repo or reach the browser. They are
-- loaded straight into the database and are deliberately not in this file.
--
-- plaintiffs is the bare fact, for the coming mechanic to look at; plaintiff_forms
-- keeps what was written, for witches. Submitting also earns a badge.
--
-- Two badges (meeting up, helping) are things the app cannot see, so one person
-- says it happened and the other confirms. One confirmation is enough. That is
-- the `vouches` table below; it only matters to these badges.

create table if not exists public.badges (
  slug  text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  -- Said warmly, as a thing you can do: "Reply on five different posts."
  how   text not null,
  -- Said once you have it.
  blurb text not null,
  -- File name under /badges/ (public/badges). Null shows a glyph.
  art   text,
  sort  int  not null default 0,
  active boolean not null default true
);

create table if not exists public.user_badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_slug text not null references public.badges (slug) on delete cascade,
  earned_at  timestamptz not null default now(),
  -- False until the person has been told, so the news rides on their next
  -- action instead of arriving unannounced.
  seen       boolean not null default false,
  primary key (user_id, badge_slug)
);
create index if not exists user_badges_user_idx on public.user_badges (user_id, earned_at desc);

alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

revoke all on public.badges, public.user_badges from anon, authenticated;
grant select on public.badges, public.user_badges to authenticated;

drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges for select to authenticated using (active);

-- Badges are recognition, so anyone signed in can see who has what.
drop policy if exists user_badges_read on public.user_badges;
create policy user_badges_read on public.user_badges for select to authenticated using (true);

-- "I met up with you" / "I helped you", waiting for the other person to say
-- yes. Written only by cr_claim_vouch and cr_answer_vouch.
create table if not exists public.vouches (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('meetup', 'helped')),
  -- Who said it happened, and who is being asked to confirm. For 'helped',
  -- claimant is the one who helped and other is the one who was helped.
  claimant    uuid not null references public.profiles (id) on delete cascade,
  other       uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  check (claimant <> other)
);
create unique index if not exists vouches_pending_idx on public.vouches (kind, claimant, other) where status = 'pending';
create unique index if not exists vouches_confirmed_idx
  on public.vouches (kind, least(claimant, other), greatest(claimant, other))
  where status = 'confirmed' and kind = 'meetup';
create unique index if not exists vouches_helped_confirmed_idx
  on public.vouches (claimant, other) where status = 'confirmed' and kind = 'helped';
create index if not exists vouches_other_idx on public.vouches (other, status);

create table if not exists public.plaintiffs (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  registered_at timestamptz not null default now()
);
alter table public.plaintiffs enable row level security;
revoke all on public.plaintiffs from anon, authenticated;
grant select on public.plaintiffs to authenticated;
-- Who is registered is not a secret: anyone signed in can see.
drop policy if exists plaintiffs_read on public.plaintiffs;
create policy plaintiffs_read on public.plaintiffs for select to authenticated using (true);

-- What was written on the form. Only the person and witches can read it.
create table if not exists public.plaintiff_forms (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  answers      jsonb not null,
  submitted_at timestamptz not null default now()
);
alter table public.plaintiff_forms enable row level security;
revoke all on public.plaintiff_forms from anon, authenticated;
grant select on public.plaintiff_forms to authenticated;
drop policy if exists plaintiff_forms_read on public.plaintiff_forms;
create policy plaintiff_forms_read on public.plaintiff_forms for select to authenticated
  using (user_id = auth.uid() or public.is_witch());

-- The answers to the form's code questions. kind is 'adc' (key: city, outland,
-- gate), 'sdc' (key: orc, elf, human, shifter, planar) or 'pcode' (key: series).
-- No grants and no policies: only the definer function below can read it. The
-- rows are loaded directly, never from this repo.
create table if not exists public.plaintiff_codes (
  kind text not null check (kind in ('adc', 'sdc', 'pcode')),
  key  text not null,
  code text not null,
  primary key (kind, key)
);
alter table public.plaintiff_codes enable row level security;
revoke all on public.plaintiff_codes from anon, authenticated;

alter table public.vouches enable row level security;
revoke all on public.vouches from anon, authenticated;
grant select on public.vouches to authenticated;
-- You can see claims you made and claims about you.
drop policy if exists vouches_read on public.vouches;
create policy vouches_read on public.vouches for select to authenticated
  using (claimant = auth.uid() or other = auth.uid());

insert into public.badges (slug, title, how, blurb, art, sort) values
  ('first-words',    'FIRST WORDS',      'Make a post.',                          'You said something to the City.', 'first-words.png', 1),
  ('show-and-tell',  'SHOW AND TELL',    'Post a picture.',                       'You shared a picture with the City.', 'show-and-tell.png', 2),
  ('joined-in',      'JOINED IN',        'Reply on five different posts.',        'You joined in on five different conversations.', 'joined-in.png', 3),
  ('whisper-web',    'WHISPER WEB',      'Whisper to five different people.',     'You whispered to five different people.', 'whisper-web.png', 4),
  ('a-voice-in-council', 'A VOICE IN COUNCIL', 'Vote on ten motions.',            'You have had your say on ten motions.', 'a-voice-in-council.png', 5),
  ('meet-in-person', 'MEET IN PERSON',   'Meet up with someone from the City. They say yes.', 'You met someone from the City in person.', 'meet-in-person.png', 6),
  ('a-helping-hand', 'A HELPING HAND',   'Help someone with a problem. They say yes.',        'Someone said you helped them.', 'a-helping-hand.png', 7),
  ('registered-plaintiff', 'REGISTERED PLAINTIFF', 'Become a Registered Plaintiff: fill in the registration form.', 'You are on the City''s books as a Registered Plaintiff.', 'registered-plaintiff.png', 8)
on conflict (slug) do update set art = excluded.art;

-- Which badges does this person qualify for right now? Inserts any new ones
-- and returns how many were new. Only the triggers below call it.
create or replace function public.award_badges(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0;
begin
  for b in select slug from public.badges where active loop
    if exists (select 1 from public.user_badges where user_id = p_user and badge_slug = b.slug) then
      continue;
    end if;

    ok := case b.slug
      when 'first-words' then
        exists (select 1 from public.posts where author_id = p_user and parent_id is null)
      when 'show-and-tell' then
        exists (select 1 from public.posts where author_id = p_user and has_image)
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
  return n;
end;
$$;

create or replace function public.trg_award_badges()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  -- One trigger function for three tables, so read the person's id out of the
  -- row generically; a record field that doesn't exist would be an error.
  v_user := nullif(to_jsonb(new) ->> (case tg_table_name
    when 'posts'        then 'author_id'
    when 'dm_messages'  then 'sender_id'
    else 'user_id'
  end), '')::uuid;
  if v_user is not null then perform public.award_badges(v_user); end if;
  return null;
end;
$$;

drop trigger if exists award_badges_posts on public.posts;
create trigger award_badges_posts after insert on public.posts
  for each row execute function public.trg_award_badges();
drop trigger if exists award_badges_whispers on public.dm_messages;
create trigger award_badges_whispers after insert on public.dm_messages
  for each row execute function public.trg_award_badges();
drop trigger if exists award_badges_votes on public.motion_votes;
create trigger award_badges_votes after insert on public.motion_votes
  for each row execute function public.trg_award_badges();

-- Tell the person what they have earned since they last heard, once.
create or replace function public.cr_claim_new_badges()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  with t as (
    update public.user_badges set seen = true
     where user_id = auth.uid() and not seen
    returning badge_slug
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug', b.slug, 'title', b.title, 'blurb', b.blurb) order by b.sort), '[]'::jsonb)
    into r from t join public.badges b on b.slug = t.badge_slug;
  return r;
end;
$$;

-- Say it happened. The two of you must already have whispered, which is also
-- how the app knows who you mean. One waiting claim per pair and kind.
create or replace function public.cr_claim_vouch(p_kind text, p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('meetup', 'helped') then return jsonb_build_object('ok', false, 'code', 'bad_kind'); end if;
  if p_other is null or p_other = auth.uid() then return jsonb_build_object('ok', false, 'code', 'bad_person'); end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  if not exists (select 1 from public.dm_threads
                  where (user_a = auth.uid() and user_b = p_other) or (user_a = p_other and user_b = auth.uid())) then
    return jsonb_build_object('ok', false, 'code', 'no_thread');
  end if;
  -- Already said, or already settled, in either direction for a meet-up.
  if exists (select 1 from public.vouches
              where kind = p_kind
                and ((claimant = auth.uid() and other = p_other)
                     or (p_kind = 'meetup' and claimant = p_other and other = auth.uid()))
                and status in ('pending', 'confirmed')) then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;
  insert into public.vouches (kind, claimant, other) values (p_kind, auth.uid(), p_other);
  return jsonb_build_object('ok', true);
end;
$$;

-- The other person answers. Only they can. Yes awards the badges at once.
create or replace function public.cr_answer_vouch(p_id bigint, p_yes boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.vouches%rowtype;
begin
  select * into v from public.vouches where id = p_id for update;
  if not found or v.other <> auth.uid() or v.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  update public.vouches
     set status = case when p_yes then 'confirmed' else 'declined' end, answered_at = now()
   where id = p_id;
  if p_yes then
    perform public.award_badges(v.claimant);
    perform public.award_badges(v.other);
  end if;
  return jsonb_build_object('ok', true, 'yes', p_yes, 'kind', v.kind);
end;
$$;

-- Form 12-A. Checks the form's rules, then registers the caller once and awards
-- the badge. Returns code 'incomplete', 'bad_adc', 'bad_sdc' or 'bad_pcode' for
-- the rule that failed (the form's own error wording is in the app). A code
-- matches if the text typed contains it, as the Google Form's "contains" rule did.
-- A missing code row fails the check, never passes it.
create or replace function public.cr_submit_plaintiff(
  p_name text, p_alias text, p_realm text, p_district text, p_district_code text,
  p_species text, p_species_code text, p_pcode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(coalesce(p_name, ''));
        v_alias text := btrim(coalesce(p_alias, ''));
        v_ok boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.plaintiffs where user_id = auth.uid()) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if char_length(v_name) = 0 or char_length(v_name) > 120 or char_length(v_alias) > 120
     or p_realm not in ('new-world', 'old-world', 'planar-outsider', 'other')
     or p_district not in ('city', 'outland', 'gate')
     or p_species not in ('orc', 'elf', 'human', 'shifter', 'planar')
     or char_length(btrim(coalesce(p_district_code, ''))) = 0
     or char_length(btrim(coalesce(p_species_code, ''))) = 0
     or char_length(btrim(coalesce(p_pcode, ''))) = 0 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;

  -- A bounded length, so a long string of digits cannot "contain" every code.
  if char_length(p_district_code) > 24 or char_length(p_species_code) > 24 or char_length(p_pcode) > 24 then
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

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'pcode' and key = 'series'
                    and position(lower(code) in lower(p_pcode)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_pcode'); end if;

  insert into public.plaintiffs (user_id) values (auth.uid()) on conflict do nothing;
  insert into public.plaintiff_forms (user_id, answers)
  values (auth.uid(), jsonb_build_object(
    'name', v_name, 'alias', v_alias, 'realm', p_realm, 'district', p_district, 'species', p_species))
  on conflict (user_id) do nothing;
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.award_badges(uuid) from public, anon, authenticated;
revoke all on function public.cr_submit_plaintiff(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.cr_submit_plaintiff(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.trg_award_badges() from public, anon, authenticated;
revoke all on function public.cr_claim_new_badges() from public, anon;
revoke all on function public.cr_claim_vouch(text, uuid) from public, anon;
revoke all on function public.cr_answer_vouch(bigint, boolean) from public, anon;
grant execute on function public.cr_claim_new_badges() to authenticated;
grant execute on function public.cr_claim_vouch(text, uuid) to authenticated;
grant execute on function public.cr_answer_vouch(bigint, boolean) to authenticated;

-- People who already did these things get their badges now, without an
-- announcement.
do $$ declare u record; begin
  for u in select id from public.profiles loop perform public.award_badges(u.id); end loop;
  update public.user_badges set seen = true;
end $$;
