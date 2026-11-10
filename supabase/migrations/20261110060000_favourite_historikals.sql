-- A heart on a Historikal you hold: it sorts to the top of your list.
alter table badge_items add column if not exists favorite boolean not null default false;

create or replace function cr_favorite(p_item bigint, p_on boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update badge_items i set favorite = p_on
   where i.id = p_item and i.owner_id = auth.uid() and i.kind = 'tradable';
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true, 'on', p_on);
end $$;
revoke all on function cr_favorite(bigint, boolean) from public;
grant execute on function cr_favorite(bigint, boolean) to authenticated;
