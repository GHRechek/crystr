-- Learn About Leylines is a side quest, not a first step (four first steps now).
update public.badges set first_step = false where slug = 'learn-leylines';

-- Help Someone Else from a scan: make sure there is a whisper thread, then ask them to say yes.
create or replace function public.cr_scan_help(p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_a uuid; v_b uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_other is null or p_other = auth.uid() or not exists (select 1 from public.profiles where id = p_other) then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  v_a := least(auth.uid(), p_other); v_b := greatest(auth.uid(), p_other);
  insert into public.dm_threads (user_a, user_b) values (v_a, v_b) on conflict (user_a, user_b) do nothing;
  return public.cr_claim_vouch('helped', p_other);
end;
$$;
revoke all on function public.cr_scan_help(uuid) from public, anon;
grant execute on function public.cr_scan_help(uuid) to authenticated;
