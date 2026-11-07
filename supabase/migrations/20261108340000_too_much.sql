-- "too much": the safety word on a whisper, as in VLVT. Anyone in the conversation can mark a message as
-- having caused off-game discomfort. The message then wears a red outline, and its sender can no longer
-- unsend it (so it stays on the record).
create or replace function public.cr_react(p_message bigint, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_emoji not in ('❤️', '😂', '😮', '😢', '👍', '🔥', 'too-much') then
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

create or replace function public.cr_unsend(p_message bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_image text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select image_path into v_image from public.dm_messages
   where id = p_message and sender_id = auth.uid() and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.dm_reactions where message_id = p_message and emoji = 'too-much') then
    return jsonb_build_object('ok', false, 'code', 'held');
  end if;
  update public.dm_messages set body = '', image_path = null, deleted_at = now() where id = p_message;
  update public.dm_reactions set emoji = null where message_id = p_message;
  return jsonb_build_object('ok', true, 'image', v_image);
end;
$$;
