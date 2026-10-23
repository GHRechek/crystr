-- A very slow passive mana gain: every member gets 1 mana a week, so no one is ever
-- truly stuck at zero.
--
--  * cr_weekly_trickle() adds 1 mana to everyone below the cap of 60 and writes a
--    ledger line ("A little time passes", kind 'trickle') for each. People already at 60
--    are skipped. It is not callable by members; only the scheduler runs it.
--  * It runs every Monday at 12:00 UTC via pg_cron (job "weekly-mana-trickle").
--  * The ledger's allowed kinds gain 'trickle'.
--
-- To change the rhythm:  select cron.alter_job((select jobid from cron.job where jobname = 'weekly-mana-trickle'), schedule => '0 12 * * *');
-- To stop it:            select cron.unschedule('weekly-mana-trickle');

alter table public.mana_ledger drop constraint mana_ledger_kind_check,
  add constraint mana_ledger_kind_check check (kind = any (array['grant','post','like','whisper','vote','oped','quest','top8','top6','wiki','trickle']));

create or replace function public.cr_weekly_trickle()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform set_config('crystr.economy', 'on', true);
  with up as (
    update public.profiles set mana = mana + 1, updated_at = now()
     where mana < 60
    returning id
  ), led as (
    insert into public.mana_ledger (user_id, amount, reason, kind)
    select id, 1, 'A little time passes', 'trickle' from up
    returning 1
  )
  select count(*) into n from led;
  return n;
end;
$$;
revoke all on function public.cr_weekly_trickle() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('weekly-mana-trickle', '0 12 * * 1', 'select public.cr_weekly_trickle()');
