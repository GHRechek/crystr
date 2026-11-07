-- Whisper reactions take the Pixelmeadow pixel emoji ("pm-1" to "pm-70") as well as the old six and "too much".
-- A whisper that was marked too much, or reported from the hold menu, can no longer be unsent: it is
-- evidence now. (A report from the hold menu starts its note with "[line <message id>]".)
create or replace function public.cr_react(p_message bigint, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if not (p_emoji in ('❤️', '😂', '😮', '😢', '👍', '🔥', 'too-much') or p_emoji ~ '^pm-([1-9]|[1-6][0-9]|70)$') then
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
declare v_image text; v_thread bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select image_path, thread_id into v_image, v_thread from public.dm_messages
   where id = p_message and sender_id = auth.uid() and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.dm_reactions where message_id = p_message and emoji = 'too-much')
     or exists (select 1 from public.reports where kind = 'whisper' and target_id = v_thread and note like ('[line ' || p_message || ']%')) then
    return jsonb_build_object('ok', false, 'code', 'held');
  end if;
  update public.dm_messages set body = '', image_path = null, deleted_at = now() where id = p_message;
  update public.dm_reactions set emoji = null where message_id = p_message;
  return jsonb_build_object('ok', true, 'image', v_image);
end;
$$;
