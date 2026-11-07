-- A witch's own profile QR is the key: someone not yet registered who scans it is let into the City
-- with no form, the same as the old override key did.
create or replace function public.cr_override_witch(p_handle text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select id, handle into w from public.profiles where handle = lower(p_handle) and is_witch;
  if not found then return jsonb_build_object('ok', false, 'code', 'unknown'); end if;
  if exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', true, 'already', true, 'witch', w.handle);
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set onboarded = true, updated_at = now() where id = auth.uid();
  insert into public.registry_overrides (user_id, witch_id) values (auth.uid(), w.id) on conflict (user_id) do nothing;
  perform public.cr_recount_cap(auth.uid());
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true, 'witch', w.handle);
end;
$$;
revoke all on function public.cr_override_witch(text) from public, anon;
grant execute on function public.cr_override_witch(text) to authenticated;
