-- Make a Friend ("Any of the Friend quests counts") had no rule behind it, so it was never given.
-- It's earned with the first of the Friend quests (Witch Friend, Elf Friend, Goblin Friend...), and
-- everyone who already has one gets it now.
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.award_badges(uuid)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$        when 'ask-for-help' then$r$, $r$        when 'first-friend' then exists (select 1 from public.user_badges fb join public.badges fk on fk.slug = fb.badge_slug
                                          where fb.user_id = p_user and fk.peer_approved and fk.kind = 'quest' and fk.how ilike 'Make friends with%')
        when 'ask-for-help' then$r$);
  if length(d) = n then raise exception 'award_badges: first-friend patch did not apply'; end if;
  execute d;
end
$do$;

select public.award_badges(fb.user_id)
  from (select distinct ub.user_id from public.user_badges ub join public.badges b on b.slug = ub.badge_slug
         where b.peer_approved and b.kind = 'quest' and b.how ilike 'Make friends with%') fb;
