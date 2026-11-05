-- Which whispers you have read. dm_reads says when each person last opened each
-- conversation; a conversation is unread for you when the other person has said something
-- (and not unsent it) since. Opening a conversation marks it read. Nothing is flooded with
-- unread to begin with: every existing conversation starts as read for both people.
create table if not exists public.dm_reads (
  thread_id bigint not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create index if not exists dm_reads_user_idx on public.dm_reads (user_id);
alter table public.dm_reads enable row level security;
revoke all on public.dm_reads from anon, authenticated;
grant select on public.dm_reads to authenticated;
drop policy if exists dm_reads_own on public.dm_reads;
create policy dm_reads_own on public.dm_reads for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.cr_mark_thread_read(p_thread bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if not exists (select 1 from public.dm_threads where id = p_thread and auth.uid() in (user_a, user_b)) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  insert into public.dm_reads (thread_id, user_id) values (p_thread, auth.uid())
  on conflict (thread_id, user_id) do update set read_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_mark_thread_read(bigint) from public, anon;
grant execute on function public.cr_mark_thread_read(bigint) to authenticated;

-- Everything that exists now counts as read.
insert into public.dm_reads (thread_id, user_id)
select t.id, u.uid from public.dm_threads t, lateral (values (t.user_a), (t.user_b)) as u(uid)
on conflict do nothing;

-- The conversations with something new for you: the other person has said something, and not
-- unsent it, since you last opened it.
create or replace function public.cr_unread_whispers()
returns bigint[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(t.id order by t.id), '{}')
    from public.dm_threads t
   where auth.uid() in (t.user_a, t.user_b)
     and exists (
       select 1 from public.dm_messages m
        where m.thread_id = t.id and m.sender_id <> auth.uid() and m.deleted_at is null
          and m.created_at > coalesce(
            (select r.read_at from public.dm_reads r where r.thread_id = t.id and r.user_id = auth.uid()),
            '-infinity'::timestamptz));
$$;
revoke all on function public.cr_unread_whispers() from public, anon;
grant execute on function public.cr_unread_whispers() to authenticated;
