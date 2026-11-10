-- A reply that arrives twice (a phone that sent the form again) is answered once and charged once: the
-- same words from the same person on the same thread within twenty seconds are the same reply. Submits
-- from one person are taken one at a time, so two at once cannot both slip past the check.
create or replace function public.cr_create_reply(
  p_parent bigint,
  p_body text,
  p_has_image boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost int := 5 + (case when p_has_image then 3 else 0 end);
  v_root bigint;
  v_id   bigint;
begin
  if char_length(btrim(p_body)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;

  -- The top of the thread: the parent itself, or the post the parent answers.
  select coalesce(parent_id, id) into v_root from public.posts where id = p_parent;
  if v_root is null then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;

  perform pg_advisory_xact_lock(hashtext('reply:' || auth.uid()::text));
  select id into v_id from public.posts
   where author_id = auth.uid() and parent_id = v_root and body = btrim(p_body) and created_at > now() - interval '20 seconds'
   order by created_at desc limit 1;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'id', v_id, 'cost', 0, 'again', true, 'mana', public.cr_balance(), 'root', v_root);
  end if;

  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Reply' || (case when p_has_image then ' with image' else '' end), 'post');

  insert into public.posts (author_id, body, has_image, cost, parent_id)
  values (auth.uid(), btrim(p_body), p_has_image, v_cost, v_root)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost,
                            'mana', public.cr_balance(), 'root', v_root);
end;
$$;
