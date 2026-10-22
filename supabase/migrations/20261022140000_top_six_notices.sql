-- Tell people when they are put in someone's Top 6.
--
-- A notice is written (by trigger) the first time one person puts another in their
-- Top 6, and only the first time: re-saving a Top 6 deletes and re-adds its rows, and
-- the unique key stops that from announcing the same person twice. The person sees a
-- banner until they dismiss it (cr_seen_top_six).

create table if not exists public.top_six_notices (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  from_user  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at    timestamptz,
  primary key (user_id, from_user)
);

alter table public.top_six_notices enable row level security;
revoke all on public.top_six_notices from anon, authenticated;
grant select on public.top_six_notices to authenticated;

create policy top_six_notices_read on public.top_six_notices for select to authenticated
  using (user_id = auth.uid());

create or replace function public.note_top_six()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.top_six_notices (user_id, from_user)
  values (new.friend_id, new.user_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger note_top_six after insert on public.top_friends
  for each row execute function public.note_top_six();

create or replace function public.cr_seen_top_six()
returns void language sql security definer set search_path = public as $$
  update public.top_six_notices set seen_at = now()
   where user_id = auth.uid() and seen_at is null;
$$;
revoke all on function public.cr_seen_top_six() from public, anon;
grant execute on function public.cr_seen_top_six() to authenticated;
revoke all on function public.note_top_six() from public, anon, authenticated;
