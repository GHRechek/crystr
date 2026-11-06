-- Dislikes is gone from the profile, so About You tops out at five fields (steps 1, 3, 5).
update public.badges set steps = array[1,3,5] where slug = 'first-bio';
