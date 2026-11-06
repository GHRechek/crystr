-- Finishing an epic quest (earning a goal badge for the first time) brings a tradable badge, drawn at
-- random like the ones five helps bring. badge_items.occasion gains 'epic'.
alter table public.badge_items drop constraint if exists badge_items_occasion_check;
alter table public.badge_items add constraint badge_items_occasion_check check (occasion is null or occasion in ('helped', 'birthday', 'epic'));

create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text; v_work jsonb; v_since timestamptz; v_steps int[];
begin
  select coalesce(working_on, '[]'::jsonb) into v_work from public.profiles where id = p_user;
  v_work := coalesce(v_work, '[]'::jsonb);
  for b in select bd.slug, bd.kind, bd.tiers, bd.metric, bd.threshold, bd.steps from public.badges bd
            where bd.active
              and (bd.kind <> 'goal' or v_work ? ('a:' || bd.slug))
              and not exists (select 1 from public.user_badges ub
                               where ub.user_id = p_user and ub.badge_slug = bd.slug and coalesce(ub.tier, 1) >= bd.tiers) loop
    select tier into v_have from public.user_badges where user_id = p_user and badge_slug = b.slug;

    if b.kind = 'goal' then
      select since into v_since from public.user_goals where user_id = p_user and slug = b.slug;
      if v_since is null then continue; end if;
      v_count := public.cr_goal_count(p_user, b.slug, v_since);
      v_steps := coalesce(b.steps, case when b.tiers > 1 then (array[5,10,25,50])[1:b.tiers] else array[coalesce(b.threshold, 1)] end);
      v_tier := least(b.tiers, (select count(*) from unnest(v_steps) s where v_count >= s));
      if v_tier = 0 then continue; end if;
      if v_have is null then
        insert into public.user_badges (user_id, badge_slug, tier) values (p_user, b.slug, v_tier) on conflict do nothing;
        -- Finishing an epic quest brings a tradable badge, drawn at random.
        if found then
          select slug into v_kind from public.badge_kinds where active order by random() limit 1;
          if v_kind is not null then
            insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion)
            values ('tradable', v_kind, p_user, p_user, 'epic');
            n := n + 1;
          end if;
        end if;
        n := n + 1;
      elsif v_tier > v_have then
        update public.user_badges set tier = v_tier, upgraded_at = now(), seen = false
         where user_id = p_user and badge_slug = b.slug;
        n := n + 1;
      end if;
      continue;
    end if;

    if b.tiers > 1 then
      v_count := public.cr_metric_all(p_user, b.metric);
      v_tier := least(b.tiers, (select count(*) from unnest(coalesce(b.steps, array[coalesce(b.threshold, 1)])) s where v_count >= s));
      if v_tier = 0 then continue; end if;
      if v_have is null then
        insert into public.user_badges (user_id, badge_slug, tier) values (p_user, b.slug, v_tier) on conflict do nothing;
        n := n + 1;
      elsif v_tier > v_have then
        update public.user_badges set tier = v_tier, upgraded_at = now(), seen = false
         where user_id = p_user and badge_slug = b.slug;
        n := n + 1;
      end if;
      continue;
    end if;

    if v_have is not null then continue; end if;
    if b.metric is not null then
      ok := public.cr_metric_all(p_user, b.metric) >= coalesce(b.threshold, 1);
    else
      ok := case b.slug
        when 'registered-plaintiff' then exists (select 1 from public.plaintiffs where user_id = p_user)
        when 'vote-on-a-motion' then exists (select 1 from public.motion_votes where user_id = p_user)
        when 'ask-for-help' then exists (select 1 from public.profiles where id = p_user and nullif(btrim(mood), '') is not null)
        else false
      end;
    end if;
    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug) on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  select count(*) into v_helped from public.vouches where kind = 'helped' and status = 'confirmed' and claimant = p_user;
  select count(*) into v_minted from public.badge_items where kind = 'tradable' and earned_by = p_user and occasion = 'helped';
  while v_minted < v_helped / 5 loop
    select slug into v_kind from public.badge_kinds where active order by random() limit 1;
    exit when v_kind is null;
    insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion)
    values ('tradable', v_kind, p_user, p_user, 'helped');
    v_minted := v_minted + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;

