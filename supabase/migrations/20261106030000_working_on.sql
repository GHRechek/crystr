-- "Working on": up to five badges a person says they are going after, shown on their profile as
-- a list below their badges. profiles.working_on is a list of names in order, "a:<slug>", each an
-- active achievement badge. Unlike the badges on show these need not be earned: they are goals.
-- A trigger drops anything that is not a real badge, repeats, and anything past five;
-- cr_set_working_on(list) is how the app saves it.

alter table public.profiles add column if not exists working_on jsonb not null default '[]'::jsonb;

create or replace function public.cr_clean_working_on(p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}';
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 5;
    continue when e = any(seen);
    if e ~ '^a:[a-z0-9-]{1,40}$' and exists (select 1 from public.badges where slug = substr(e, 3) and active) then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_working_on(jsonb) from public, anon, authenticated;

create or replace function public.profiles_working_on_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.working_on is distinct from old.working_on then
    new.working_on := public.cr_clean_working_on(new.working_on);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_working_on_guard on public.profiles;
create trigger profiles_working_on_guard before update of working_on on public.profiles
  for each row execute function public.profiles_working_on_guard();

create or replace function public.cr_set_working_on(p_list jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  v := public.cr_clean_working_on(p_list);
  update public.profiles set working_on = v where id = auth.uid();
  return jsonb_build_object('ok', true, 'working_on', v);
end;
$$;
revoke all on function public.cr_set_working_on(jsonb) from public, anon;
grant execute on function public.cr_set_working_on(jsonb) to authenticated;
