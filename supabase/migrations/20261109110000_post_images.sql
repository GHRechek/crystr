-- Pictures on posts, for real. The composer uploads the picture to the person's own folder of the proofs
-- bucket (the same place Well proofs go, with the same rules: ten megabytes, images only, readable by
-- everyone once a post points at it) and cr_create_post takes its path as p_image. The post stores it as
-- proof_path, which the app already turns into the picture on the card. The price is as it was: five, and
-- three more with a picture.
drop function if exists public.cr_create_post(text, boolean, text, text, int);
create or replace function public.cr_create_post(p_body text, p_has_image boolean default false, p_badge text default null, p_audio text default null, p_audio_seconds int default null, p_image text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_has_image boolean := p_has_image or p_image is not null;
        v_cost int;
        v_id bigint;
        v_badge text := null;
begin
  v_cost := 5 + (case when v_has_image then 3 else 0 end) + (case when p_audio is not null then 10 else 0 end);
  if char_length(btrim(coalesce(p_body, ''))) = 0 and p_audio is null and p_image is null then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;
  if p_image is not null and (p_image not like (auth.uid()::text || '/%')
       or not exists (select 1 from storage.objects where bucket_id = 'proofs' and name = p_image)) then
    return jsonb_build_object('ok', false, 'code', 'bad_image');
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
  perform public.cr_take(v_cost, 'Post' || (case when p_audio is not null then ' with voice' when v_has_image then ' with image' else '' end), 'post');
  insert into public.posts (author_id, body, has_image, cost, badge_slug, audio_path, audio_seconds, proof_path)
  values (auth.uid(), btrim(coalesce(p_body, '')), v_has_image, v_cost, v_badge, p_audio, case when p_audio is null then null else p_audio_seconds end, p_image)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_create_post(text, boolean, text, text, int, text) from public, anon;
grant execute on function public.cr_create_post(text, boolean, text, text, int, text) to authenticated;
