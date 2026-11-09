-- The star row on a profile (where OBSESSED WITH was): the person's Proof, then four badges they pick. Until they
-- pick, it shows their four newest. Only badges they have earned are kept.
alter table public.profiles add column if not exists star_badges jsonb not null default '[]'::jsonb;

create or replace function public.cr_set_star_badges(p_list jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb := '[]'::jsonb; e text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_list is not null and jsonb_typeof(p_list) = 'array' then
    for e in select jsonb_array_elements_text(p_list) loop
      exit when jsonb_array_length(v) >= 4;
      continue when v @> to_jsonb(e);
      if e ~ '^[a-z0-9-]{1,40}$' and exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = e) then v := v || to_jsonb(e); end if;
    end loop;
  end if;
  update public.profiles set star_badges = v where id = auth.uid();
  return jsonb_build_object('ok', true, 'star', v);
end;
$$;
revoke all on function public.cr_set_star_badges(jsonb) from public, anon;
grant execute on function public.cr_set_star_badges(jsonb) to authenticated;
