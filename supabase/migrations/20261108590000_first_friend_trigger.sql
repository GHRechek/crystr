-- The trigger that gives Make a Friend on earning a Friend quest listed 'witch-friend', but Witch
-- Friend's slug is 'meet-witch', so it never fired for it. It now goes by what a Friend quest is
-- (a peer quest that says "Make friends with..."), so a new one counts without a list to keep.
create or replace function public.trg_first_friend() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.badge_slug = 'make-friends' or exists (select 1 from public.badges b where b.slug = new.badge_slug
       and b.peer_approved and b.kind = 'quest' and b.how ilike 'Make friends with%') then
    insert into public.user_badges (user_id, badge_slug) values (new.user_id, 'first-friend') on conflict do nothing;
  end if;
  return null;
end;
$$;
