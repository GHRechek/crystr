-- The tiered badges keep their ladder (five, ten, twenty-five, fifty) but stop advertising
-- it: the badge says five, and steps up on its own. The count behind it is nobody's
-- business, so the function that told it goes.
update public.badges set how = 'Reply on five different posts.' where slug = 'joined-in';
update public.badges set how = 'Whisper to five different people.' where slug = 'whisper-web';
update public.badges set how = 'Vote on five motions.' where slug = 'a-voice-in-council';
drop function if exists public.cr_badge_counts();
