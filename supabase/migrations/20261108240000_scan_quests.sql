-- The quests you can ask this person about right now: ones that need someone else to confirm, that
-- they can actually be a part of (their species, spellcaster or witch), that you have not earned,
-- have no question waiting with them, and, for epic ones, that you picked and they have not already
-- counted for since you picked it. Epic ones come first.
create or replace function public.cr_scan_quests(p_other uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(b.slug order by (b.kind = 'goal') desc, b.sort), '{}')
    from public.badges b, public.profiles o
   where o.id = p_other and p_other <> auth.uid() and auth.uid() is not null
     and b.active and b.peer_approved
     and (b.peer_target is null
          or (b.peer_target = 'spellcaster' and o.spellcaster)
          or (b.peer_target = 'witch' and o.is_witch)
          or (b.peer_target not in ('spellcaster', 'witch') and o.species = b.peer_target))
     and not exists (select 1 from public.user_badges ub where ub.user_id = auth.uid() and ub.badge_slug = b.slug and coalesce(ub.tier, 1) >= b.tiers)
     and not exists (select 1 from public.badge_claims c where c.badge_slug = b.slug and c.claimant = auth.uid() and c.other = p_other and c.status = 'pending')
     and (b.kind <> 'goal' or (
          exists (select 1 from public.user_goals g where g.user_id = auth.uid() and g.slug = b.slug)
          and not exists (select 1 from public.badge_claims c, public.user_goals g
                           where g.user_id = auth.uid() and g.slug = b.slug and c.badge_slug = b.slug
                             and c.claimant = auth.uid() and c.other = p_other and c.status = 'confirmed' and c.answered_at >= g.since)));
$$;
revoke all on function public.cr_scan_quests(uuid) from public, anon;
grant execute on function public.cr_scan_quests(uuid) to authenticated;
