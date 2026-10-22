-- Profiles are for members, not for the whole internet.
--
-- Applied to the live database on 2026-10-22. Before this, the "viewable by
-- everyone" policy applied to the `public` role, so anyone holding the (public)
-- anon key could list every profile: handle, display name, Google photo URL, mana,
-- witch status, mood, bio. Now:
--   * reads need a signed-in session,
--   * `anon` has no privileges on profiles at all,
--   * a new sign-up no longer gets the Google account's real name or photo copied
--     into the profile (people go by in-world handles; a display name is something
--     they choose to write), and
--   * the Google photo URLs already stored were cleared (the app never used them;
--     it draws faces from /face).
-- Display names that people have written themselves were left alone.

alter policy "Profiles are viewable by everyone" on public.profiles to authenticated;
revoke all on public.profiles from anon;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'user_' || substr(new.id::text, 1, 8))
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles set avatar_url = null where avatar_url is not null;
