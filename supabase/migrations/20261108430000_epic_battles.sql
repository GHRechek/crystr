-- Epic battles: your token is a gym badge. When picking your team you can lead with it (put it up).
--  * Both put tokens up: an epic battle. The winner gets a copy of the loser's token; the loser keeps theirs but
--    can't put it up again for three months.
--  * One puts a token up and the other can't (or won't) but stakes a Historikal instead: the token side is asked
--    to stake a Historikal too. Both staked: an epic battle for Historikals; the winner takes the loser's.
--  * Anything else: a normal battle.
-- Walking away from an epic battle once it has started counts as losing it.

-- Historikals won in battle are a kind of occasion too (the every-fifth-win prize needs it).
alter table public.badge_items drop constraint if exists badge_items_occasion_check;
alter table public.badge_items add constraint badge_items_occasion_check check (occasion is null or occasion = any (array['helped', 'birthday', 'epic', 'battle']));

create table if not exists public.epic_results (
  id bigserial primary key,
  kind text not null check (kind in ('token', 'historikal')),
  winner uuid not null references public.profiles(id) on delete cascade,
  loser uuid not null references public.profiles(id) on delete cascade,
  item bigint,
  at timestamptz not null default now()
);
create index if not exists epic_results_loser on public.epic_results (loser, at desc);
alter table public.epic_results enable row level security;

-- Can this person put their token up? They need one, and not to have lost it in the last three months.
create or replace function public.cr_token_ok(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tokens where user_id = p_user and design is not null)
     and not exists (select 1 from public.epic_results where loser = p_user and kind = 'token' and at > now() - interval '3 months');
$$;

-- What someone has offered to stake, checked: their token, one of their Historikals, or nothing.
create or replace function public.cr_stake_check(p_user uuid, p_stake jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when p_stake ? 'token' and public.cr_token_ok(p_user) then '{"token":true}'::jsonb
    when p_stake ? 'item' and exists (select 1 from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
                                       where i.id = (p_stake->>'item')::bigint and i.owner_id = p_user and i.kind = 'tradable' and k.element is not null)
      then jsonb_build_object('item', (p_stake->>'item')::bigint)
    else null end;
$$;

-- Both teams are in: what kind of battle is it?
create or replace function public.cr_stake_settle(s jsonb) returns jsonb
language plpgsql immutable as $$
declare a jsonb := s->'stake'->'a'; b jsonb := s->'stake'->'b';
begin
  if a ? 'token' and b ? 'token' then return s || '{"epic":"token","next":"pick"}'::jsonb; end if;
  if a ? 'token' and b ? 'item' then return s || '{"ask":"a","next":"stake"}'::jsonb; end if;
  if b ? 'token' and a ? 'item' then return s || '{"ask":"b","next":"stake"}'::jsonb; end if;
  if a ? 'item' and b ? 'item' then return s || '{"epic":"historikal","next":"pick"}'::jsonb; end if;
  return (s - 'epic') || '{"stake":{"a":null,"b":null},"next":"pick"}'::jsonb;
end;
$$;

-- The winner's prize.
create or replace function public.cr_epic_payout(p_e public.encounters, s jsonb, w text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare win uuid := case when w = 'a' then p_e.a else p_e.b end; lose uuid := case when w = 'a' then p_e.b else p_e.a end;
        l text := case when w = 'a' then 'b' else 'a' end; it bigint; v_design jsonb;
begin
  perform set_config('crystr.economy', 'on', true);
  if s->>'epic' = 'token' then
    select design into v_design from public.tokens where user_id = lose;
    if v_design is null then return null; end if;
    insert into public.badge_items (kind, earned_by, title, design, owner_id, seen, occasion)
    values ('token', lose, public.token_title(lose), v_design, win, false, 'epic') returning id into it;
    insert into public.epic_results (kind, winner, loser, item) values ('token', win, lose, it);
    perform public.cr_recount_cap(win);
    return jsonb_build_object('w', w, 'kind', 'token', 'item', it);
  end if;
  it := (s->'stake'->l->>'item')::bigint;
  if it is null or not exists (select 1 from public.badge_items where id = it and owner_id = lose) then return null; end if;
  update public.badge_items set owner_id = win, acquired_at = now(), seen = false where id = it;
  insert into public.epic_results (kind, winner, loser, item) values ('historikal', win, lose, it);
  return jsonb_build_object('w', w, 'kind', 'historikal', 'item', it);
end;
$$;
revoke all on function public.cr_token_ok(uuid), public.cr_stake_check(uuid, jsonb), public.cr_stake_settle(jsonb), public.cr_epic_payout(public.encounters, jsonb, text) from public, anon, authenticated;

do $do$
declare d text;
begin
  -- ----- acting -----
  select pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure) into d;
  d := replace(d, 'alive_a boolean; alive_b boolean; down_a boolean; down_b boolean;', 'alive_a boolean; alive_b boolean; down_a boolean; down_b boolean; w text;');
  -- the team comes with what you put up, and once both are in, the stakes are settled
  d := replace(d, $r$    s := jsonb_set(jsonb_set(s, array['team', me], to_jsonb(ids)), array['ready', me], 'true'::jsonb);
    if (s->'ready'->>th)::boolean then vs := 'pick'; end if;$r$,
$r$    s := s || jsonb_build_object('stake', coalesce(s->'stake', '{"a":null,"b":null}'::jsonb));
    s := jsonb_set(jsonb_set(s, array['team', me], to_jsonb(ids)), array['ready', me], 'true'::jsonb);
    s := jsonb_set(s, array['stake', me], coalesce(public.cr_stake_check(auth.uid(), p_act->'stake'), 'null'::jsonb));
    if (s->'ready'->>th)::boolean then s := public.cr_stake_settle(s); vs := s->>'next'; s := s - 'next'; end if;
  -- they put a Historikal up against your token: stake one of yours too, or just fight
  elsif e.kind = 'battle' and vs = 'stake' then
    if act <> 'answer' or s->>'ask' <> me then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    if public.cr_stake_check(auth.uid(), p_act->'stake') ? 'item' then
      s := jsonb_set(s, array['stake', me], public.cr_stake_check(auth.uid(), p_act->'stake')) || '{"epic":"historikal"}'::jsonb;
    else
      s := (s - 'epic') || '{"stake":{"a":null,"b":null}}'::jsonb;
    end if;
    s := s - 'ask'; vs := 'pick';$r$);
  -- an epic battle that ends (or is walked out of) pays its winner
  d := replace(d, '  update public.encounters set stage = vs, st = s, seq = seq + 1, updated_at = now() where id = p_id;',
$r$  if e.kind = 'battle' and e.stage in ('fight', 'replace') and vs in ('end', 'off') and s->>'epic' is not null then
    if vs = 'end' then
      alive_a := exists (select 1 from jsonb_array_elements_text(s->'team'->'a') y where (s->'hp'->'a'->>y)::int > 0);
      alive_b := exists (select 1 from jsonb_array_elements_text(s->'team'->'b') y where (s->'hp'->'b'->>y)::int > 0);
      w := case when alive_a and not alive_b then 'a' when alive_b and not alive_a then 'b' end;
    else
      w := case s->>'off_by' when 'a' then 'b' when 'b' then 'a' end;
    end if;
    if w is not null then s := s || jsonb_build_object('prize', public.cr_epic_payout(e, s, w)); end if;
  end if;
  update public.encounters set stage = vs, st = s, seq = seq + 1, updated_at = now() where id = p_id;$r$);
  execute d;

  -- ----- seeing -----
  select pg_get_functiondef('public.cr_enc_view(bigint)'::regprocedure) into d;
  d := replace(d, '  if e.stage = ''shadow'' then',
$r$  v := v || jsonb_build_object(
    'epic', s->>'epic', 'ask', e.stage = 'stake' and s->>'ask' = me,
    'token_ok', public.cr_token_ok(auth.uid()),
    'my_token', (select design from public.tokens where user_id = auth.uid()),
    'stake', s->'stake'->me,
    'their_stake', case when s->'stake'->th ? 'item' then jsonb_build_object('item', public.cr_hk((s->'stake'->th->>'item')::bigint))
                        when s->'stake'->th ? 'token' then jsonb_build_object('token', (select design from public.tokens where user_id = o)) else null end,
    'prize', case when s->'prize' is null then null
                  else jsonb_build_object('won', s->'prize'->>'w' = me, 'kind', s->'prize'->>'kind',
                         'item', case when s->'prize'->>'kind' = 'historikal' then public.cr_hk((s->'prize'->>'item')::bigint) else null end,
                         'token', case when s->'prize'->>'kind' = 'token' then (select design from public.badge_items where id = (s->'prize'->>'item')::bigint) else null end) end);
  if e.stage = 'shadow' then$r$);
  execute d;
end
$do$;

-- When asked to stake a Historikal, you choose from your whole collection.
do $do$
declare d text;
begin
  select pg_get_functiondef('public.cr_enc_view(bigint)'::regprocedure) into d;
  d := replace(d, '(e.kind = ''battle'' and e.stage = ''team'')', '(e.kind = ''battle'' and e.stage in (''team'', ''stake''))');
  execute d;
end
$do$;
