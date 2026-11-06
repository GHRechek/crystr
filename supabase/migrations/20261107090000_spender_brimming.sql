-- Spender: spend 200 mana, one step. Brimming: keep your mana up at dawn.
-- Every day at 6 am (US Eastern standard time) everyone's mana is written down in mana_dawn. A
-- badge counts the longest run of days in a row with at least 15 mana at dawn, which is where
-- everyone starts. Brimming asks for five days in a row.
create table if not exists public.mana_dawn (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null,
  mana    int  not null,
  cap     int  not null,
  primary key (user_id, day)
);
alter table public.mana_dawn enable row level security;
revoke all on public.mana_dawn from anon, authenticated;

create or replace function public.cr_dawn_snapshot()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  insert into public.mana_dawn (user_id, day, mana, cap)
  select id, (now() at time zone 'America/New_York')::date, mana, mana_cap from public.profiles
  on conflict do nothing;
  for r in select id from public.profiles loop
    begin perform public.award_badges(r.id);
    exception when others then raise warning 'award_badges failed for %: %', r.id, sqlerrm; end;
  end loop;
end;
$$;
revoke all on function public.cr_dawn_snapshot() from public, anon, authenticated;

create or replace function public.cr_metric_x(p_user uuid, p_metric text)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare v bigint := 0;
begin
  case p_metric
    when 'image_posts' then select count(*) into v from public.posts where author_id = p_user and has_image;
    when 'profile_fields' then
      select (case when char_length(btrim(coalesce(bio, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(likes, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(dislikes, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(food, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(obsession, ''))) > 0 then 1 else 0 end
            + case when birthday is not null then 1 else 0 end) into v from public.profiles where id = p_user;
    when 'token_stage' then
      select (case when exists (select 1 from public.tokens where user_id = p_user) then 1 else 0 end
            + case when exists (select 1 from public.tokens where user_id = p_user and nullif(btrim(coalesce(how, '')), '') is not null) then 1 else 0 end
            + case when exists (select 1 from public.tokens where user_id = p_user and last_given_at is not null) then 1 else 0 end) into v;
    when 'dawn_streak' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select day, day - (row_number() over (order by day))::int as grp
            from public.mana_dawn where user_id = p_user and mana >= 15
        ) g group by grp) x;
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_metric_x(uuid, text) from public, anon, authenticated;

create or replace function public.cr_metric_all(p_user uuid, p_metric text)
returns bigint language sql stable security definer set search_path = public as $$
  select case when p_metric in ('image_posts', 'profile_fields', 'token_stage', 'dawn_streak')
              then public.cr_metric_x(p_user, p_metric) else public.cr_metric(p_user, p_metric) end;
$$;
revoke all on function public.cr_metric_all(uuid, text) from public, anon, authenticated;

update public.badges set metric = 'mana_spent', steps = null, tiers = 1, threshold = 200,
       how = 'Spend 200 mana.', blurb = 'Spent 200 mana.' where slug = 'first-spend';
update public.badges set metric = 'dawn_streak', steps = null, tiers = 1, threshold = 5,
       how = 'Have at least 15 mana at 6 am, five days in a row.', blurb = 'Kept their mana up at dawn for five days.' where slug = 'full-well';

select cron.schedule('dawn-mana-snapshot', '0 11 * * *', 'select public.cr_dawn_snapshot()');
