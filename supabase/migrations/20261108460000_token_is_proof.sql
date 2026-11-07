-- Tokens are called Proofs now (the name only: tables and code keep "token").
create or replace function public.token_title(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select split_part(coalesce(nullif(btrim(display_name), ''), handle), ' ', 1) || '''s Proof'
    from public.profiles where id = p_user;
$$;
update public.badge_items set title = regexp_replace(title, '''s Token$', '''s Proof') where kind = 'token' and title ~ '''s Token$';
update public.badges set how = 'Win someone''s Proof in an epic battle.', blurb = 'Won a Proof.' where slug = 'got-token';
update public.badges set how = 'Make your Proof and write how to earn it.', blurb = 'Made a Proof.' where slug = 'token-made';

-- The Proof's line is what would make you risk it.
update public.badges set how = 'Make your Proof and say what would make you risk it.' where slug = 'token-made';
