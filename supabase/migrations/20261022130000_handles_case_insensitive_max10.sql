-- Handles: one person per name whatever the capitalisation, at most 10 characters.
--
--  * Unique on lower(handle), so "Wren" and "wren" are the same name.
--  * A trigger enforces the shape on any new or changed handle: 1-10 characters from
--    letters, digits, "_", "." and "-", stored lower-case. It only looks when the handle
--    itself is being set, so a handle longer than 10 that existed before this rule keeps
--    working (and keeps earning mana, etc.) until its owner picks a new one.
--  * New arrivals get a 10-character starter handle, u_ + 8 hex, instead of
--    user_ + 8 hex (13 characters), retrying on the rare clash.

create unique index if not exists profiles_handle_lower_key on public.profiles (lower(handle));

create or replace function public.check_handle()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.handle is not distinct from old.handle then
    return new;
  end if;
  new.handle := lower(new.handle);
  if new.handle is null or length(new.handle) not between 1 and 10
     or new.handle !~ '^[a-z0-9_.-]+$' then
    raise exception 'handle must be 1-10 letters, digits, _ . or -' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger check_handle before insert or update of handle on public.profiles
  for each row execute function public.check_handle();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  loop
    begin
      insert into public.profiles (id, handle)
      values (new.id, 'u_' || substr(md5(new.id::text || n::text), 1, 8))
      on conflict (id) do nothing;
      return new;
    exception when unique_violation then
      n := n + 1;
      if n > 5 then raise; end if;
    end;
  end loop;
end;
$$;
