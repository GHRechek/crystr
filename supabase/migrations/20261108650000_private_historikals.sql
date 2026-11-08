-- Someone's Historikals are theirs to keep to themselves: the only ones anyone else can read are the
-- ones in their display (their front three), plus the two items in a trade offer you're part of.
-- Battles, draws, trades and the rest run as security definer functions and aren't limited by this.
drop policy if exists badge_items_read on public.badge_items;
create policy badge_items_read on public.badge_items for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.profiles p
                where p.id = badge_items.owner_id and coalesce(p.shown_badges, '[]'::jsonb) ? ('i:' || badge_items.id))
    or exists (select 1 from public.badge_trades t
                where (t.give_item = badge_items.id or t.want_item = badge_items.id)
                  and (select auth.uid()) in (t.from_user, t.to_user))
  );
