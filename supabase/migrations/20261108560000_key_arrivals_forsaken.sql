-- Let in by a witch's key means Forsaken: the registry has no line for them, and that's who the key is
-- for. They're marked so as they come in (a witch is never marked), and from then on their votes go
-- in with a witch's key too.
create or replace function public.trg_key_arrival_forsaken()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set species = 'forsaken' where id = new.user_id and not is_witch;
  return null;
end;
$$;
revoke all on function public.trg_key_arrival_forsaken() from public, anon, authenticated;
drop trigger if exists key_arrival_forsaken on public.registry_overrides;
create trigger key_arrival_forsaken after insert on public.registry_overrides
  for each row execute function public.trg_key_arrival_forsaken();
