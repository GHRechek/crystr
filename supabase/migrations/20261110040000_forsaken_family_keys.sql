-- The whole Forsaken family comes in by a witch's key: the registry goes haywire for Other, Undead and
-- Planar alike. The species they chose on the form travels with the key, so an undead let in by a witch
-- is undead, a planar is planar, and Other is Forsaken (as before).
create or replace function public.cr_override_witch(p_handle text, p_species text default null)
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
  if p_species in ('undead', 'planar') then update public.profiles set species = p_species where id = auth.uid() and not is_witch; end if;
  perform public.cr_recount_cap(auth.uid());
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true, 'witch', w.handle);
end;
$$;
revoke all on function public.cr_override_witch(text, text) from public, anon;
grant execute on function public.cr_override_witch(text, text) to authenticated;
drop function if exists public.cr_override_witch(text);

create or replace function public.cr_override_onboard(p_code text, p_species text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select k.witch_id, w.handle into k
    from public.override_keys k join public.profiles w on w.id = k.witch_id
   where k.code = p_code and w.is_witch;
  if not found then return jsonb_build_object('ok', false, 'code', 'unknown'); end if;
  if exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', true, 'already', true, 'witch', k.handle);
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set onboarded = true, updated_at = now() where id = auth.uid();
  insert into public.registry_overrides (user_id, witch_id) values (auth.uid(), k.witch_id)
    on conflict (user_id) do nothing;
  if p_species in ('undead', 'planar') then update public.profiles set species = p_species where id = auth.uid() and not is_witch; end if;
  perform public.cr_recount_cap(auth.uid());
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true, 'witch', k.handle);
end;
$$;
revoke all on function public.cr_override_onboard(text, text) from public, anon;
grant execute on function public.cr_override_onboard(text, text) to authenticated;
drop function if exists public.cr_override_onboard(text);
