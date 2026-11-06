-- Badge requests: some badges are earned by doing something and posting it ("go hiking, post a
-- selfie in nature"). The person makes a post marked as a request for that badge, and when a witch
-- likes the post, the badge is theirs. No one else's like counts.
--   badges.witch_approved   this badge is earned that way
--   posts.badge_slug        this post is a request for that badge
alter table public.badges add column if not exists witch_approved boolean not null default false;
alter table public.posts  add column if not exists badge_slug text references public.badges (slug) on delete set null;
create index if not exists posts_badge_idx on public.posts (badge_slug) where badge_slug is not null;

-- Same as before, with the badge a post asks for. A request must name a witch-approved badge the
-- person does not have yet.
drop function if exists public.cr_create_post(text, boolean);
create or replace function public.cr_create_post(p_body text, p_has_image boolean default false, p_badge text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cost int := 5 + (case when p_has_image then 3 else 0 end);
        v_id bigint;
        v_badge text := null;
begin
  if char_length(btrim(p_body)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'empty');
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
  perform public.cr_take(v_cost, 'Post' || (case when p_has_image then ' with image' else '' end), 'post');
  insert into public.posts (author_id, body, has_image, cost, badge_slug)
  values (auth.uid(), btrim(p_body), p_has_image, v_cost, v_badge)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_create_post(text, boolean, text) from public, anon;
grant execute on function public.cr_create_post(text, boolean, text) to authenticated;

-- A witch's like on a request is the approval.
create or replace function public.trg_badge_request_liked()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_badge text;
begin
  select author_id, badge_slug into v_author, v_badge from public.posts where id = new.post_id;
  if v_badge is null or v_author is null or v_author = new.user_id then return new; end if;
  if not exists (select 1 from public.profiles where id = new.user_id and is_witch) then return new; end if;
  if not exists (select 1 from public.badges where slug = v_badge and active and witch_approved) then return new; end if;
  insert into public.user_badges (user_id, badge_slug) values (v_author, v_badge) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists badge_request_liked on public.post_likes;
create trigger badge_request_liked after insert on public.post_likes
  for each row execute function public.trg_badge_request_liked();

-- The first two.
insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved) values
  ('take-a-hike', 'Take a Hike', 'Go hiking, take a selfie in nature and post it.', 'Went hiking and had a witch approve the selfie.', 'set/132.png', 100, true, true),
  ('latte-art', 'Latte Art', 'Take a picture of latte art and post it.', 'Posted latte art a witch approved of.', 'set/114.png', 101, true, true)
on conflict (slug) do nothing;
