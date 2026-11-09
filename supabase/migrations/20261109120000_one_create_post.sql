-- A leftover three-argument cr_create_post (from before voice clips) made a call with only body, image flag
-- and badge ambiguous once the six-argument one existed: the API could not choose between them, so
-- "get help" from the profile, which calls it that way, failed. One function now.
drop function if exists public.cr_create_post(text, boolean, text);
