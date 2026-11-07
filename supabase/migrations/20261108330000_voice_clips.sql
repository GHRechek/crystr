-- Voice clips. Low-quality mono recordings in a private "voice" bucket (1 MB cap).
--  * Posts: p/<user id>/<file>. A post with a voice clip costs 15 (10 more than a plain post), up to
--    two minutes. Anyone signed in can listen.
--  * Whispers: w/<thread id>/<file>. A voice whisper costs 3, up to two minutes. It plays once: the
--    first time the other person plays it, it is marked heard and the file is removed (cr_voice_heard
--    marks it; the app then deletes the file). After that the cassette no longer plays.
alter table public.posts add column if not exists audio_path text, add column if not exists audio_seconds int;
alter table public.dm_messages
  add column if not exists audio_path text,
  add column if not exists audio_seconds int,
  add column if not exists audio_heard_at timestamptz;

alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check check (
  char_length(btrim(body)) <= 2000 and (char_length(btrim(body)) >= 1 or audio_path is not null));
alter table public.dm_messages drop constraint if exists dm_messages_body_check;
alter table public.dm_messages add constraint dm_messages_body_check check (
  char_length(btrim(body)) <= 2000
  and (char_length(btrim(body)) >= 1 or image_path is not null or post_id is not null or audio_path is not null or deleted_at is not null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 1048576, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/x-m4a'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "voice upload" on storage.objects;
create policy "voice upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and (
    ((storage.foldername(name))[1] = 'p' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or ((storage.foldername(name))[1] = 'w' and exists (
      select 1 from public.dm_threads t where t.id::text = (storage.foldername(name))[2] and (select auth.uid()) in (t.user_a, t.user_b)))));
drop policy if exists "voice read" on storage.objects;
create policy "voice read" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and (
    (storage.foldername(name))[1] = 'p'
    or ((storage.foldername(name))[1] = 'w' and exists (
      select 1 from public.dm_threads t where t.id::text = (storage.foldername(name))[2] and (select auth.uid()) in (t.user_a, t.user_b)))));
drop policy if exists "voice delete" on storage.objects;
create policy "voice delete" on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and (
    owner_id = (select auth.uid())::text
    or ((storage.foldername(name))[1] = 'w' and exists (
      select 1 from public.dm_threads t where t.id::text = (storage.foldername(name))[2] and (select auth.uid()) in (t.user_a, t.user_b)))));

drop function if exists public.cr_create_post(text, boolean, text);
create or replace function public.cr_create_post(p_body text, p_has_image boolean default false, p_badge text default null, p_audio text default null, p_audio_seconds int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cost int := 5 + (case when p_has_image then 3 else 0 end) + (case when p_audio is not null then 10 else 0 end);
        v_id bigint;
        v_badge text := null;
begin
  if char_length(btrim(coalesce(p_body, ''))) = 0 and p_audio is null then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;
  if p_audio is not null and (p_audio not like ('p/' || auth.uid()::text || '/%') or coalesce(p_audio_seconds, 0) not between 1 and 120
       or not exists (select 1 from storage.objects where bucket_id = 'voice' and name = p_audio)) then
    return jsonb_build_object('ok', false, 'code', 'bad_audio');
  end if;
  if p_badge is not null then
    if not exists (select 1 from public.badges where slug = p_badge and active and witch_approved) then
      return jsonb_build_object('ok', false, 'code', 'bad_badge');
    end if;
    if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_badge) then
      return jsonb_build_object('ok', false, 'code', 'have_it');
    end if;
    v_badge := p_badge;
  end if;
  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Post' || (case when p_audio is not null then ' with voice' when p_has_image then ' with image' else '' end), 'post');
  insert into public.posts (author_id, body, has_image, cost, badge_slug, audio_path, audio_seconds)
  values (auth.uid(), btrim(coalesce(p_body, '')), p_has_image, v_cost, v_badge, p_audio, case when p_audio is null then null else p_audio_seconds end)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_create_post(text, boolean, text, text, int) from public, anon;
grant execute on function public.cr_create_post(text, boolean, text, text, int) to authenticated;

drop function if exists public.cr_send_message(bigint, text, text, bigint);
create or replace function public.cr_send_message(p_thread_id bigint, p_body text, p_image text default null, p_reply bigint default null, p_audio text default null, p_audio_seconds int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_body text := btrim(coalesce(p_body, '')); v_id bigint; v_cost int := case when p_audio is not null then 3 else 1 end;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if char_length(v_body) = 0 and p_image is null and p_audio is null then
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
  if p_audio is not null and (p_audio not like ('w/' || p_thread_id::text || '/%') or coalesce(p_audio_seconds, 0) not between 1 and 120
       or not exists (select 1 from storage.objects where bucket_id = 'voice' and name = p_audio)) then
    return jsonb_build_object('ok', false, 'code', 'bad_audio');
  end if;
  if p_reply is not null and not exists (
       select 1 from public.dm_messages where id = p_reply and thread_id = p_thread_id and deleted_at is null) then
    p_reply := null;
  end if;
  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, case when p_audio is not null then 'Voice whisper' else 'Whisper' end, 'whisper');
  insert into public.dm_messages (thread_id, sender_id, body, image_path, reply_to, audio_path, audio_seconds)
  values (p_thread_id, auth.uid(), v_body, p_image, p_reply, p_audio, case when p_audio is null then null else p_audio_seconds end) returning id into v_id;
  update public.dm_threads set last_message_at = now() where id = p_thread_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_send_message(bigint, text, text, bigint, text, int) from public, anon;
grant execute on function public.cr_send_message(bigint, text, text, bigint, text, int) to authenticated;

-- The other person plays a voice whisper: it is marked heard, once, and its path is handed back so
-- the app can remove the file.
create or replace function public.cr_voice_heard(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select dm.id, dm.sender_id, dm.audio_path, dm.audio_heard_at, t.user_a, t.user_b into m
    from public.dm_messages dm join public.dm_threads t on t.id = dm.thread_id
   where dm.id = p_id for update of dm;
  if not found or m.audio_path is null or auth.uid() not in (m.user_a, m.user_b) or auth.uid() = m.sender_id then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if m.audio_heard_at is not null then return jsonb_build_object('ok', false, 'code', 'heard'); end if;
  update public.dm_messages set audio_heard_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'path', m.audio_path);
end;
$$;
revoke all on function public.cr_voice_heard(bigint) from public, anon;
grant execute on function public.cr_voice_heard(bigint) to authenticated;
