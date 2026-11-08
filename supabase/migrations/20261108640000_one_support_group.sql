-- Two support group quests: keep the first steps one (Support Group, a witch says you were there) and
-- remove the duplicate. Nobody held it, claimed it, showed it or was working on it.
delete from public.badges where slug = 'attend-a-support-group';
