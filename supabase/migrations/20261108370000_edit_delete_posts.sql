-- Edit or delete a post from its menu: your own, or anyone's if you are a witch. Deleting takes its
-- replies and likes with it; a whisper that carried it says the post is gone.
alter table public.posts add column if not exists edited_at timestamptz;

create or replace function public.cr_edit_post(p_id bigint, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_body text := btrim(coalesce(p_body, '')); v_author uuid; v_audio text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select author_id, audio_path into v_author, v_audio from public.posts where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if v_author <> auth.uid() and not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if char_length(v_body) > 2000 or (char_length(v_body) = 0 and v_audio is null) then
    return jsonb_build_object('ok', false, 'code', 'bad_body');
  end if;
  update public.posts set body = v_body, edited_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_edit_post(bigint, text) from public, anon;
grant execute on function public.cr_edit_post(bigint, text) to authenticated;

create or replace function public.cr_delete_post(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_parent bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select author_id, parent_id into v_author, v_parent from public.posts where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if v_author <> auth.uid() and not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  delete from public.posts where id = p_id;
  return jsonb_build_object('ok', true, 'parent', v_parent);
end;
$$;
revoke all on function public.cr_delete_post(bigint) from public, anon;
grant execute on function public.cr_delete_post(bigint) to authenticated;
