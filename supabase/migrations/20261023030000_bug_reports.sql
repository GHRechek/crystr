-- "Report a bug", from the game-info menu.
--
-- A member sends a short description; the page they were on and their browser (read by the
-- server, not typed) come along. Witches read and resolve them at /bugs. A reporter sees only
-- their own; ten a day each. Written only by cr_report_bug / cr_resolve_bug.
create table if not exists public.bug_reports (
  id           bigint generated always as identity primary key,
  reporter     uuid references public.profiles(id) on delete set null,
  body         text not null check (char_length(btrim(body)) between 1 and 1000),
  page         text check (page is null or char_length(page) <= 200),
  device       text check (device is null or char_length(device) <= 300),
  status       text not null default 'open' check (status in ('open', 'fixed', 'closed')),
  created_at   timestamptz not null default now(),
  handled_by   uuid references public.profiles(id) on delete set null,
  handled_at   timestamptz,
  handled_note text check (handled_note is null or char_length(handled_note) <= 500)
);
create index if not exists idx_bug_reports_status on public.bug_reports (status, created_at);
create index if not exists idx_bug_reports_reporter on public.bug_reports (reporter, created_at);
create index if not exists idx_bug_reports_handled_by on public.bug_reports (handled_by);

alter table public.bug_reports enable row level security;
revoke all on public.bug_reports from anon, authenticated;
grant select on public.bug_reports to authenticated;
create policy bug_reports_read on public.bug_reports for select to authenticated
  using (reporter = (select auth.uid()) or public.is_witch());

create or replace function public.cr_report_bug(p_body text, p_page text, p_device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_body text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if char_length(v_body) = 0 then return jsonb_build_object('ok', false, 'code', 'empty'); end if;
  if (select count(*) from public.bug_reports
       where reporter = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('ok', false, 'code', 'too_many');
  end if;
  insert into public.bug_reports (reporter, body, page, device)
  values (auth.uid(), left(v_body, 1000), left(nullif(btrim(coalesce(p_page, '')), ''), 200), left(nullif(btrim(coalesce(p_device, '')), ''), 300));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_report_bug(text, text, text) from public, anon;
grant execute on function public.cr_report_bug(text, text, text) to authenticated;

create or replace function public.cr_resolve_bug(p_id bigint, p_status text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'not_witch'); end if;
  if p_status not in ('fixed', 'closed') then return jsonb_build_object('ok', false, 'code', 'bad_status'); end if;
  update public.bug_reports
     set status = p_status, handled_by = auth.uid(), handled_at = now(),
         handled_note = left(nullif(btrim(coalesce(p_note, '')), ''), 500)
   where id = p_id and status = 'open';
  if not found then return jsonb_build_object('ok', false, 'code', 'gone'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_resolve_bug(bigint, text, text) from public, anon;
grant execute on function public.cr_resolve_bug(bigint, text, text) to authenticated;
