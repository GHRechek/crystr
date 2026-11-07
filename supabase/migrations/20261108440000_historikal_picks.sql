-- A pick: a one-time gift letting someone choose any one Historikal they like.
create table if not exists public.historikal_picks (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  item bigint
);
create index if not exists historikal_picks_open on public.historikal_picks (user_id) where used_at is null;
alter table public.historikal_picks enable row level security;

alter table public.badge_items drop constraint if exists badge_items_occasion_check;
alter table public.badge_items add constraint badge_items_occasion_check check (occasion is null or occasion = any (array['helped', 'birthday', 'epic', 'battle', 'pick']));

-- How many picks you have waiting.
create or replace function public.cr_picks_open() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.historikal_picks where user_id = auth.uid() and used_at is null;
$$;

-- Spend one on the creature you chose.
create or replace function public.cr_pick_historikal(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_pick bigint; v_title text; it bigint;
begin
  select title into v_title from public.badge_kinds where slug = p_slug and active and droppable and element is not null;
  if not found then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
  select id into v_pick from public.historikal_picks where user_id = auth.uid() and used_at is null order by id limit 1 for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'none'); end if;
  perform set_config('crystr.economy', 'on', true);
  insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion, seen) values ('tradable', p_slug, auth.uid(), auth.uid(), 'pick', true) returning id into it;
  update public.historikal_picks set used_at = now(), item = it where id = v_pick;
  return jsonb_build_object('ok', true, 'name', v_title, 'item', it);
end;
$$;
revoke all on function public.cr_picks_open(), public.cr_pick_historikal(text) from public, anon;
grant execute on function public.cr_picks_open(), public.cr_pick_historikal(text) to authenticated;

-- The first two.
insert into public.historikal_picks (user_id, note)
select id, 'A gift: pick any one' from public.profiles where handle in ('sammiwithaneye', 'darkmagemahllyc');
