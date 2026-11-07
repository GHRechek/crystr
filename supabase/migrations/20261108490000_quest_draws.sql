-- More draws (FIND ONE!): one for each first step you finish, and one for every three side quests (the
-- quests that aren't first steps). Counted from when this went in: quests finished before it don't pay out.

alter table public.historikal_draws drop constraint if exists historikal_draws_source_check;
alter table public.historikal_draws add constraint historikal_draws_source_check
  check (source in ('quest', 'helped', 'battle', 'birthday', 'gift', 'first_step', 'side'));

do $do$
declare since timestamptz := now();
begin
  execute format($f$
    create or replace function public.cr_quest_draws(p_user uuid) returns int
    language plpgsql security definer set search_path = public as $$
    declare v_steps int; v_side int; v_have int; n int := 0;
    begin
      select count(*) into v_steps from public.user_badges ub join public.badges b on b.slug = ub.badge_slug
       where ub.user_id = p_user and b.first_step and ub.earned_at >= %1$L;
      select count(*) into v_side from public.user_badges ub join public.badges b on b.slug = ub.badge_slug
       where ub.user_id = p_user and b.kind = 'quest' and not coalesce(b.first_step, false) and ub.earned_at >= %1$L;
      select count(*) into v_have from public.historikal_draws where user_id = p_user and source = 'first_step';
      while v_have < v_steps loop
        insert into public.historikal_draws (user_id, kind, source) values (p_user, 'normal', 'first_step'); v_have := v_have + 1; n := n + 1;
      end loop;
      select count(*) into v_have from public.historikal_draws where user_id = p_user and source = 'side';
      while v_have < v_side / 3 loop
        insert into public.historikal_draws (user_id, kind, source) values (p_user, 'normal', 'side'); v_have := v_have + 1; n := n + 1;
      end loop;
      return n;
    end;
    $$;$f$, since);
end
$do$;
revoke all on function public.cr_quest_draws(uuid) from public, anon, authenticated;

alter table public.badge_items drop constraint if exists badge_items_occasion_check;
alter table public.badge_items add constraint badge_items_occasion_check check (occasion is null or occasion = any (array['helped', 'birthday', 'epic', 'battle', 'pick', 'quest']));

-- cr_draw names its creature's occasion from the draw's source; these are quests too.
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_draw(text)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$case v_draw.source when 'quest' then 'epic' when 'gift' then 'pick' else v_draw.source end$r$,
                  $r$case v_draw.source when 'quest' then 'epic' when 'gift' then 'pick' when 'first_step' then 'quest' when 'side' then 'quest' else v_draw.source end$r$);
  if length(d) = n then raise exception 'cr_draw: occasion patch did not apply'; end if;
  execute d;

  -- Whenever badges are worked out, the quest draws are too.
  select pg_get_functiondef('public.award_badges(uuid)'::regprocedure) into d;
  n := length(d);
  d := regexp_replace(d, 'return n;\s*end;\s*\$function\$', 'n := n + public.cr_quest_draws(p_user); return n; end; $function$');
  if length(d) = n then raise exception 'award_badges: quest draws patch did not apply'; end if;
  execute d;
end
$do$;
