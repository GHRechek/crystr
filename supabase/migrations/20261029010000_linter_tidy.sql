-- Tidy-ups the database linter asked for, and a drop that did not land the first time.
--  * The two helper functions pin their search_path like every other function here.
--  * registry_overrides.witch_id gets the index its foreign key wants.
--  * cr_badge_counts is gone (20261029000000_badge_tiers_quiet.sql meant to drop it).
-- Replacing a function keeps its grants.

create or replace function public.badge_tier_for(n bigint)
returns int language sql immutable set search_path = public as $$
  select case when n >= 50 then 4 when n >= 25 then 3 when n >= 10 then 2 when n >= 5 then 1 else 0 end;
$$;

create or replace function public.override_new_code()
returns text language sql volatile set search_path = public as $$
  select left(replace(gen_random_uuid()::text, '-', ''), 16) || left(replace(gen_random_uuid()::text, '-', ''), 16);
$$;

create index if not exists registry_overrides_witch_idx on public.registry_overrides (witch_id);

drop function if exists public.cr_badge_counts();
