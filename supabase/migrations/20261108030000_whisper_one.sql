-- A whisper costs 1 mana (it was 2): sending one, sending one with a picture or a reply, and
-- sending someone a post in a whisper. Reports still cost 2.
create or replace function public.cr_send_whisper(p_thread_id bigint, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if char_length(btrim(p_body)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;
  if not exists (select 1 from public.dm_threads
                  where id = p_thread_id
                    and (user_a = auth.uid() or user_b = auth.uid())) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if public.cr_balance() < 1 then return public.cr_short(1); end if;
  perform public.cr_take(1, 'Whisper', 'whisper');
  insert into public.dm_messages (thread_id, sender_id, body)
  values (p_thread_id, auth.uid(), btrim(p_body));
  update public.dm_threads set last_message_at = now() where id = p_thread_id;
  return jsonb_build_object('ok', true, 'mana', public.cr_balance());
end;
$$;

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
  if public.cr_balance() < 1 then return public.cr_short(1); end if;
  perform public.cr_take(1, 'Whisper', 'whisper');
  insert into public.dm_messages (thread_id, sender_id, body, image_path, reply_to)
  values (p_thread_id, auth.uid(), v_body, p_image, p_reply) returning id into v_id;
  update public.dm_threads set last_message_at = now() where id = p_thread_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'mana', public.cr_balance());
end;
$$;

create or replace function public.cr_send_post(p_post bigint, p_other uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_note text := left(btrim(coalesce(p_note, '')), 500);
        v_a uuid; v_b uuid; v_thread bigint; v_id bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_other is null or p_other = auth.uid() then return jsonb_build_object('ok', false, 'code', 'self'); end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if not exists (select 1 from public.posts where id = p_post) then
    return jsonb_build_object('ok', false, 'code', 'no_post');
  end if;
  if public.cr_balance() < 1 then return public.cr_short(1); end if;

  v_a := least(auth.uid(), p_other); v_b := greatest(auth.uid(), p_other);
  insert into public.dm_threads (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into v_thread;

  perform public.cr_take(1, 'Whisper', 'whisper');
  insert into public.dm_messages (thread_id, sender_id, body, post_id)
  values (v_thread, auth.uid(), v_note, p_post) returning id into v_id;
  update public.dm_threads set last_message_at = now() where id = v_thread;
  return jsonb_build_object('ok', true, 'id', v_id, 'thread_id', v_thread, 'mana', public.cr_balance());
end;
$$;
