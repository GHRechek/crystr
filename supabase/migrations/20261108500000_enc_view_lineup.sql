-- At an epic invite, what you can stake is your Proof or your lineup: the view says which Historikals those are.
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_enc_view(bigint)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$    'lineup_ok', public.cr_lineup_ok(auth.uid()),$r$, $r$    'lineup_ok', public.cr_lineup_ok(auth.uid()), 'lineup', to_jsonb(public.cr_lineup(auth.uid())),$r$);
  if length(d) = n then raise exception 'cr_enc_view: lineup patch did not apply'; end if;
  execute d;
end
$do$;

-- And a staked Historikal has to be one of your lineup.
create or replace function public.cr_stake_check(p_user uuid, p_stake jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when p_stake ? 'token' and public.cr_token_ok(p_user) then '{"token":true}'::jsonb
    when p_stake ? 'item' and (p_stake->>'item')::bigint = any(public.cr_lineup(p_user))
      then jsonb_build_object('item', (p_stake->>'item')::bigint)
    else null end;
$$;
revoke all on function public.cr_stake_check(uuid, jsonb) from public, anon, authenticated;
