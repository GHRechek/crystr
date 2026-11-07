-- The Forsaken have no SDC: the registry tells them to see a licensed witch, and a witch's key is
-- how they come into the City at all. Voting on a motion is the same: a Forsaken's vote (and a
-- second vote) is only taken with a witch's key, scanned there and then. The vote remembers whose
-- key it was. Witches never need one.

alter table public.motion_votes add column if not exists witch_id uuid references public.profiles(id) on delete set null;

-- Whether someone needs a witch's key to vote.
create or replace function public.cr_needs_witch_key(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select species = 'forsaken' and not is_witch from public.profiles where id = p_user), false);
$$;
-- Whose key a scan is: a witch's profile QR (their handle), as the registry takes it, or an old
-- override key. A witch, or null.
create or replace function public.cr_witch_of_key(p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from public.profiles where handle = lower(p_code) and is_witch and id <> auth.uid()),
    (select k.witch_id from public.override_keys k join public.profiles w on w.id = k.witch_id
      where k.code = p_code and w.is_witch and k.witch_id <> auth.uid()));
$$;
revoke all on function public.cr_needs_witch_key(uuid), public.cr_witch_of_key(text) from public, anon, authenticated;

do $do$
declare d text; n int;
begin
  -- A first vote.
  select pg_get_functiondef('public.cr_cast_vote(bigint, text)'::regprocedure) into d;
  d := replace(d, 'public.cr_cast_vote(p_motion bigint, p_side text)', 'public.cr_cast_vote(p_motion bigint, p_side text, p_key text)');
  d := replace(d, $r$declare v_closes timestamptz;$r$, $r$declare v_closes timestamptz; v_witch uuid;$r$);
  n := length(d);
  d := regexp_replace(d, $r$(  if public\.cr_balance\(\) < 3 then)$r$, $r$  if public.cr_needs_witch_key(auth.uid()) then
    v_witch := public.cr_witch_of_key(coalesce(p_key, ''));
    if v_witch is null then return jsonb_build_object('ok', false, 'code', case when p_key is null then 'need_key' else 'bad_key' end); end if;
  end if;
\1$r$);
  if length(d) = n then raise exception 'cr_cast_vote: key patch did not apply'; end if;
  n := length(d);
  d := replace(d, $r$insert into public.motion_votes (motion_id, user_id, side) values (p_motion, auth.uid(), p_side);$r$,
                  $r$insert into public.motion_votes (motion_id, user_id, side, witch_id) values (p_motion, auth.uid(), p_side, v_witch);$r$);
  if length(d) = n then raise exception 'cr_cast_vote: insert patch did not apply'; end if;
  execute d;

  -- A second vote.
  select pg_get_functiondef('public.cr_vote_again(bigint)'::regprocedure) into d;
  d := replace(d, 'public.cr_vote_again(p_motion bigint)', 'public.cr_vote_again(p_motion bigint, p_key text)');
  d := replace(d, $r$declare v_closes timestamptz; v_side text; v_votes int;$r$, $r$declare v_closes timestamptz; v_side text; v_votes int; v_witch uuid;$r$);
  n := length(d);
  d := regexp_replace(d, $r$(  if public\.cr_balance\(\) < 15 then)$r$, $r$  if public.cr_needs_witch_key(auth.uid()) then
    v_witch := public.cr_witch_of_key(coalesce(p_key, ''));
    if v_witch is null then return jsonb_build_object('ok', false, 'code', case when p_key is null then 'need_key' else 'bad_key' end); end if;
  end if;
\1$r$);
  if length(d) = n then raise exception 'cr_vote_again: key patch did not apply'; end if;
  execute d;
end
$do$;

-- The old shapes go through the new ones with no key, so a Forsaken can't slip past by calling them.
create or replace function public.cr_cast_vote(p_motion bigint, p_side text) returns jsonb
language sql security definer set search_path = public as $$ select public.cr_cast_vote(p_motion, p_side, null::text); $$;
create or replace function public.cr_vote_again(p_motion bigint) returns jsonb
language sql security definer set search_path = public as $$ select public.cr_vote_again(p_motion, null::text); $$;
revoke all on function public.cr_cast_vote(bigint, text, text), public.cr_vote_again(bigint, text) from public, anon;
grant execute on function public.cr_cast_vote(bigint, text, text), public.cr_vote_again(bigint, text) to authenticated;
