-- Sending a post to someone in a whisper. The post's menu gets SEND beside REPORT; picking a
-- person opens (or finds) the whisper between you, drops the post into it with an optional
-- note, and costs what any whisper costs: 2 mana.
--
--  * dm_messages.post_id: the post a message carries. If the post is deleted the message
--    stays and says the post is gone. Unsending the message lets go of the post.
--  * the words rule now also allows a message that is only a post.
--  * cr_send_post(post, other, note) does it all in one go.

alter table public.dm_messages
  add column if not exists post_id bigint references public.posts(id) on delete set null;
create index if not exists dm_messages_post_idx on public.dm_messages (post_id) where post_id is not null;

alter table public.dm_messages drop constraint if exists dm_messages_body_check;
alter table public.dm_messages add constraint dm_messages_body_check check (
  char_length(btrim(body)) <= 2000
  and (char_length(btrim(body)) >= 1 or image_path is not null or post_id is not null or deleted_at is not null));

-- Unsending lets go of the post it carried.
create or replace function public.dm_messages_unsend_post()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.deleted_at is not null then new.post_id := null; end if;
  return new;
end;
$$;
drop trigger if exists dm_messages_unsend_post on public.dm_messages;
create trigger dm_messages_unsend_post before update on public.dm_messages
  for each row execute function public.dm_messages_unsend_post();

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
  if public.cr_balance() < 2 then return public.cr_short(2); end if;

  v_a := least(auth.uid(), p_other); v_b := greatest(auth.uid(), p_other);
  insert into public.dm_threads (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into v_thread;

  perform public.cr_take(2, 'Whisper', 'whisper');
  insert into public.dm_messages (thread_id, sender_id, body, post_id)
  values (v_thread, auth.uid(), v_note, p_post) returning id into v_id;
  update public.dm_threads set last_message_at = now() where id = v_thread;
  return jsonb_build_object('ok', true, 'id', v_id, 'thread_id', v_thread, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_send_post(bigint, uuid, text) from public, anon;
grant execute on function public.cr_send_post(bigint, uuid, text) to authenticated;
