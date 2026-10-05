-- Replies: one level, five mana, same as a post.
--
-- NOT APPLIED. A reply is a post that points at another post. Additive and
-- backward compatible: parent_id is nullable and every existing row stays a
-- top-level post, so the current app keeps working until the new one ships.
--
-- One level only: replying to a reply attaches to the post at the top of that
-- thread, so a thread is a post and a flat list under it.

alter table public.posts
  add column if not exists parent_id bigint;

do $$ begin
  alter table public.posts
    add constraint posts_parent_id_fkey
    foreign key (parent_id) references public.posts (id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- A thread's replies, oldest first.
create index if not exists posts_parent_idx
  on public.posts (parent_id, created_at)
  where parent_id is not null;

-- Same shape as cr_create_post: same price (5, and 3 more for an image), same
-- ledger, same check-the-balance-first rule, written only by a definer function.
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

  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Reply' || (case when p_has_image then ' with image' else '' end), 'post');

  insert into public.posts (author_id, body, has_image, cost, parent_id)
  values (auth.uid(), btrim(p_body), p_has_image, v_cost, v_root)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost,
                            'mana', public.cr_balance(), 'root', v_root);
end;
$$;

revoke all on function public.cr_create_reply(bigint, text, boolean) from public, anon;
grant execute on function public.cr_create_reply(bigint, text, boolean) to authenticated;
