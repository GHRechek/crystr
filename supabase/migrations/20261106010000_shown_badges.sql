-- Displayed badges: up to five of a person's own badges, shown on their profile above the
-- About card. profiles.shown_badges is a list of names, in the order shown:
--   a:<slug>   an achievement they have earned (user_badges)
--   i:<id>     a tradable badge they hold now (badge_items, owner_id = them)
-- Only badges they have actually earned or hold can be shown, whoever writes it: a trigger
-- drops anything else (and anything past five, or repeated), so a badge traded away stops being
-- shown the next time the list is saved, and the page skips what is no longer theirs.
-- cr_set_shown_badges(list) is how the app saves it.

alter table public.profiles add column if not exists shown_badges jsonb not null default '[]'::jsonb;

create or replace function public.cr_clean_shown_badges(p_user uuid, p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}'; ok boolean;
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 5;
    continue when e = any(seen);
    ok := false;
    if e ~ '^a:[a-z0-9-]{1,40}$' then
      ok := exists (select 1 from public.user_badges where user_id = p_user and badge_slug = substr(e, 3));
    elsif e ~ '^i:[0-9]{1,18}$' then
      ok := exists (select 1 from public.badge_items where id = substr(e, 3)::bigint and owner_id = p_user and kind = 'tradable');
    end if;
    if ok then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_shown_badges(uuid, jsonb) from public, anon, authenticated;

create or replace function public.profiles_shown_badges_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shown_badges is distinct from old.shown_badges then
    new.shown_badges := public.cr_clean_shown_badges(new.id, new.shown_badges);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_shown_badges_guard on public.profiles;
create trigger profiles_shown_badges_guard before update of shown_badges on public.profiles
  for each row execute function public.profiles_shown_badges_guard();

create or replace function public.cr_set_shown_badges(p_list jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  v := public.cr_clean_shown_badges(auth.uid(), p_list);
  update public.profiles set shown_badges = v where id = auth.uid();
  return jsonb_build_object('ok', true, 'shown', v);
end;
$$;
revoke all on function public.cr_set_shown_badges(jsonb) from public, anon;
grant execute on function public.cr_set_shown_badges(jsonb) to authenticated;
