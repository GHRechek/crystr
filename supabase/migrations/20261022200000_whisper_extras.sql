-- Whispers: replies, reactions, pictures, and unsending.
--
--  * dm_messages gains image_path (a file in the private "whispers" bucket), reply_to
--    (the message this one answers) and deleted_at (set when its sender unsends it).
--    Unsending clears the words and the picture for both people, for good.
--  * dm_reactions: one reaction per person per message, from a fixed set of six. Tapping
--    the same one again takes it back (emoji becomes null). Reacting is free.
--  * The "whispers" bucket is private, 5 MB, images only. Only the two people in a thread
--    can upload to or read from that thread's folder (<thread id>/<file>).
--  * cr_send_message replaces cr_send_whisper (which is revoked, not dropped): the same
--    price, with an optional picture and an optional message being answered.

alter table public.dm_messages
  add column if not exists image_path text,
  add column if not exists reply_to   bigint references public.dm_messages(id) on delete set null,
  add column if not exists deleted_at timestamptz;
create index if not exists idx_dm_messages_reply_to on public.dm_messages (reply_to);

create table if not exists public.dm_reactions (
  message_id bigint not null references public.dm_messages(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  emoji      text,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists idx_dm_reactions_user_id on public.dm_reactions (user_id);

alter table public.dm_reactions enable row level security;
revoke all on public.dm_reactions from anon, authenticated;
grant select on public.dm_reactions to authenticated;
create policy dm_reactions_read on public.dm_reactions for select to authenticated
  using (exists (select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id
                  where m.id = dm_reactions.message_id
                    and (select auth.uid()) in (t.user_a, t.user_b)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whispers', 'whispers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "upload to own whisper thread" on storage.objects for insert to authenticated
  with check (bucket_id = 'whispers' and exists (
    select 1 from public.dm_threads t
     where t.id::text = (storage.foldername(name))[1] and (select auth.uid()) in (t.user_a, t.user_b)));
create policy "read own whisper thread" on storage.objects for select to authenticated
  using (bucket_id = 'whispers' and exists (
    select 1 from public.dm_threads t
     where t.id::text = (storage.foldername(name))[1] and (select auth.uid()) in (t.user_a, t.user_b)));

create or replace function public.cr_send_message(p_thread_id bigint, p_body text, p_image text default null, p_reply bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_body text := btrim(coalesce(p_body, '')); v_id bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if char_length(v_body) = 0 and p_image is null then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;
  if char_length(v_body) > 2000 then v_body := left(v_body, 2000); end if;
  if not exists (select 1 from public.dm_threads
                  where id = p_thread_id and (user_a = auth.uid() or user_b = auth.uid())) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_image is not null and (p_image not like (p_thread_id::text || '/%') or not exists (
       select 1 from storage.objects where bucket_id = 'whispers' and name = p_image)) then
    return jsonb_build_object('ok', false, 'code', 'bad_image');
  end if;
  if p_reply is not null and not exists (
       select 1 from public.dm_messages where id = p_reply and thread_id = p_thread_id and deleted_at is null) then
    p_reply := null;
  end if;
  if public.cr_balance() < 2 then return public.cr_short(2); end if;
  perform public.cr_take(2, 'Whisper', 'whisper');
  insert into public.dm_messages (thread_id, sender_id, body, image_path, reply_to)
  values (p_thread_id, auth.uid(), v_body, p_image, p_reply) returning id into v_id;
  update public.dm_threads set last_message_at = now() where id = p_thread_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_send_message(bigint, text, text, bigint) from public, anon;
grant execute on function public.cr_send_message(bigint, text, text, bigint) to authenticated;
revoke execute on function public.cr_send_whisper(bigint, text) from public, anon, authenticated;

create or replace function public.cr_react(p_message bigint, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_emoji not in ('❤️', '😂', '😮', '😢', '👍', '🔥') then
    return jsonb_build_object('ok', false, 'code', 'bad_emoji');
  end if;
  if not exists (select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id
                  where m.id = p_message and m.deleted_at is null and auth.uid() in (t.user_a, t.user_b)) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select emoji into v_old from public.dm_reactions where message_id = p_message and user_id = auth.uid();
  insert into public.dm_reactions (message_id, user_id, emoji) values (p_message, auth.uid(), p_emoji)
  on conflict (message_id, user_id)
  do update set emoji = case when public.dm_reactions.emoji = excluded.emoji then null else excluded.emoji end,
                created_at = now();
  return jsonb_build_object('ok', true, 'removed', v_old = p_emoji);
end;
$$;
revoke all on function public.cr_react(bigint, text) from public, anon;
grant execute on function public.cr_react(bigint, text) to authenticated;

create or replace function public.cr_unsend(p_message bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_image text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select image_path into v_image from public.dm_messages
   where id = p_message and sender_id = auth.uid() and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  update public.dm_messages set body = '', image_path = null, deleted_at = now() where id = p_message;
  update public.dm_reactions set emoji = null where message_id = p_message;
  return jsonb_build_object('ok', true, 'image', v_image);
end;
$$;
revoke all on function public.cr_unsend(bigint) from public, anon;
grant execute on function public.cr_unsend(bigint) to authenticated;

-- The old rule (a message must have words) is relaxed: a picture alone is fine, and an
-- unsent message has none.
alter table public.dm_messages drop constraint dm_messages_body_check,
  add constraint dm_messages_body_check check (
    char_length(btrim(body)) <= 2000
    and (char_length(btrim(body)) >= 1 or image_path is not null or deleted_at is not null));

-- The sender can clear their picture from storage when they unsend.
create policy "remove own whisper picture" on storage.objects for delete to authenticated
  using (bucket_id = 'whispers' and owner_id = (select auth.uid())::text);

-- Reports on a conversation note pictures, and leave out unsent messages. (cr_submit_report is
-- re-created with that one change to its whisper excerpt; otherwise as in 20261022150000.)
