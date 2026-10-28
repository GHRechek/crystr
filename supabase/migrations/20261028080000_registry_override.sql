-- The override. Some of the City's people cannot fill in the registry: the form has no line
-- for what they are. Every witch holds a key, shown as a QR code on /me/override; scanning
-- it sends the new arrival to /override/<code>, which breaks them into the records with no
-- form at all (cr_override_onboard). They are on the City's books as "let in by <witch>",
-- not as registered plaintiffs. A key is the witch's for good: it does not change, and it
-- opens the City for as long as they are a witch.
--
--  * override_keys: one key per witch. Only the witch reads theirs.
--  * registry_overrides: who came in this way, through whose key. Witches read all of it.
--  * cr_override_key(): the witch's own key, made the first time they ask.
--  * cr_override_peek(code): is this a witch's key, and whose. cr_override_onboard(code):
--    the breach itself.

create table if not exists public.override_keys (
  witch_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.override_keys enable row level security;
revoke all on public.override_keys from anon, authenticated;
grant select on public.override_keys to authenticated;
drop policy if exists override_keys_read on public.override_keys;
create policy override_keys_read on public.override_keys for select to authenticated
  using (witch_id = (select auth.uid()));

create table if not exists public.registry_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  witch_id uuid references public.profiles(id) on delete set null,
  at timestamptz not null default now()
);
alter table public.registry_overrides enable row level security;
revoke all on public.registry_overrides from anon, authenticated;
grant select on public.registry_overrides to authenticated;
drop policy if exists registry_overrides_read on public.registry_overrides;
create policy registry_overrides_read on public.registry_overrides for select to authenticated
  using (user_id = (select auth.uid()) or public.is_witch());

-- 32 hex characters, 128 bits of chance, from the database's own uuid maker.
create or replace function public.override_new_code()
returns text language sql volatile as $$
  select left(replace(gen_random_uuid()::text, '-', ''), 16) || left(replace(gen_random_uuid()::text, '-', ''), 16);
$$;
revoke all on function public.override_new_code() from public, anon, authenticated;

-- The witch's key, made the first time they ask and the same ever after.
create or replace function public.cr_override_key()
returns jsonb language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if auth.uid() is null or not public.is_witch() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into k from public.override_keys where witch_id = auth.uid();
  if not found then
    insert into public.override_keys (witch_id, code) values (auth.uid(), public.override_new_code())
    returning * into k;
  end if;
  return jsonb_build_object('ok', true, 'code', k.code, 'created_at', k.created_at);
end;
$$;

-- Is this a witch's key, and whose. Anyone signed in may ask; a key is 128 bits of chance,
-- so asking tells nothing about the others. A key whose holder is no longer a witch opens
-- nothing.
create or replace function public.cr_override_peek(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_witch text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select w.handle into v_witch
    from public.override_keys k join public.profiles w on w.id = k.witch_id
   where k.code = p_code and w.is_witch;
  if not found then return jsonb_build_object('ok', false, 'code', 'unknown'); end if;
  return jsonb_build_object('ok', true, 'witch', v_witch);
end;
$$;

-- The breach: the caller is let into the City with no form filled, on a witch's key. They
-- do not become a registered plaintiff (no plaintiffs row, no form on the books), so that
-- badge stays out of reach; everything else opens like it does for anyone registered.
create or replace function public.cr_override_onboard(p_code text)
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
  perform public.cr_recount_cap(auth.uid());
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true, 'witch', k.handle);
end;
$$;

revoke all on function public.cr_override_key() from public, anon;
revoke all on function public.cr_override_peek(text) from public, anon;
revoke all on function public.cr_override_onboard(text) from public, anon;
grant execute on function public.cr_override_key() to authenticated;
grant execute on function public.cr_override_peek(text) to authenticated;
grant execute on function public.cr_override_onboard(text) to authenticated;
