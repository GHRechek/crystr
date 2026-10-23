-- You can take back your own like (the mana is not refunded).
create policy "unlike your own" on public.post_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));
