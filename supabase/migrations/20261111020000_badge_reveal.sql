-- Badges you earn on your own (filling your Top 5, a day more in the City) had no moment: the check on a
-- page load awarded them quietly, and only an action's toast ever said so. Now every unseen badge gets
-- the chest and the key in the app, which marks it seen on DONE. The toast's claim no longer touches
-- badges, so the reveal always gets them; it still claims Historikals and tokens.

create or replace function public.cr_badge_seen(p_slug text)
returns void language sql security definer set search_path to 'public' as $$
  update public.user_badges set seen = true where user_id = auth.uid() and badge_slug = p_slug;
$$;
revoke all on function public.cr_badge_seen(text) from public, anon;
grant execute on function public.cr_badge_seen(text) to authenticated;

create or replace function public.cr_claim_new_badges()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare r jsonb;
begin
  with i as (
    update public.badge_items set seen = true
     where owner_id = auth.uid() and not seen
    returning id, kind, kind_slug, title
  ), named as (
    select coalesce(k.slug, 'token-' || i.id::text) as slug,
           case when i.kind = 'tradable' then k.title else i.title end as title,
           case when i.kind = 'tradable' then k.blurb else 'Their own token, given to you.' end as blurb,
           coalesce(k.sort, 0) as sort,
           case when i.kind = 'tradable' then 1 else 2 end as grp,
           1 as tier
      from i left join public.badge_kinds k on k.slug = i.kind_slug
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'blurb', blurb, 'tier', tier) order by grp, sort), '[]'::jsonb)
    into r from named;
  return r;
end;
$$;
