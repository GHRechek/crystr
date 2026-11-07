-- A second vote on a motion: the same side again, counted twice, for 15 mana. Once per motion.
alter table public.motion_votes add column if not exists votes int not null default 1 check (votes between 1 and 2);

create or replace function public.motion_tallies() returns table(motion_id bigint, votes_for bigint, votes_against bigint)
language sql stable security definer set search_path = public as $$
  select m.id,
         coalesce(sum(v.votes) filter (where v.side = 'for'), 0),
         coalesce(sum(v.votes) filter (where v.side = 'against'), 0)
    from public.motions m
    left join public.motion_votes v on v.motion_id = m.id
   group by m.id;
$$;

create or replace function public.cr_vote_again(p_motion bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_closes timestamptz; v_side text; v_votes int;
begin
  select closes_at into v_closes from public.motions where id = p_motion;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if v_closes <= now() then return jsonb_build_object('ok', false, 'code', 'closed'); end if;
  select side, votes into v_side, v_votes from public.motion_votes where motion_id = p_motion and user_id = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_yet'); end if;
  if v_votes >= 2 then return jsonb_build_object('ok', false, 'code', 'already'); end if;
  if public.cr_balance() < 15 then return public.cr_short(15); end if;
  perform public.cr_take(15, 'Second vote — ' || v_side, 'vote');
  update public.motion_votes set votes = 2, cost = coalesce(cost, 0) + 15 where motion_id = p_motion and user_id = auth.uid();
  return jsonb_build_object('ok', true, 'side', v_side, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_vote_again(bigint) from public, anon;
grant execute on function public.cr_vote_again(bigint) to authenticated;
