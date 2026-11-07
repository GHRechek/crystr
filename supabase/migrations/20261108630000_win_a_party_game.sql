-- A quest done with someone: win a party game. Scan whoever you played (or played against) and it counts.
insert into public.badges (slug, title, how, blurb, art, sort, active, tiers, witch_approved, peer_approved, peer_target, kind, first_step, scan_instant)
values ('win-a-party-game', 'Win a Party Game', 'Win a party game against someone.', 'Won a party game.', 'set/1009.png', 624, true, 1, false, true, null, 'quest', false, false)
on conflict (slug) do nothing;
