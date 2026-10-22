-- Terms of service acceptance, and reports.
--
-- tos_acceptances: one row per person per version of the terms they accepted. Raising
-- TERMS_VERSION in lib/terms.ts asks everyone to accept again. Each person can read only
-- their own rows; rows are written only by cr_accept_tos.
--
-- reports: a member reports a post, or a whisper conversation they are in. The
-- server copies the evidence (the post, or the last few messages) into the report, so it
-- survives the content being deleted, and works out who it is about itself rather
-- than trusting the browser. Witches read and resolve reports; reporters can see only their
-- own. Reporting costs nothing.

create table if not exists public.tos_acceptances (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  version     integer not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.tos_acceptances enable row level security;
revoke all on public.tos_acceptances from anon, authenticated;
grant select on public.tos_acceptances to authenticated;
create policy tos_acceptances_read on public.tos_acceptances for select to authenticated
  using (user_id = auth.uid());

create or replace function public.cr_accept_tos(p_version integer)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_version is null or p_version < 1 or p_version > 1000 then
    return jsonb_build_object('ok', false, 'code', 'bad_version');
  end if;
  insert into public.tos_acceptances (user_id, version) values (auth.uid(), p_version)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_accept_tos(integer) from public, anon;
grant execute on function public.cr_accept_tos(integer) to authenticated;

create table if not exists public.reports (
  id           bigint generated always as identity primary key,
  reporter     uuid references public.profiles(id) on delete set null,
  about_user   uuid references public.profiles(id) on delete set null,
  kind         text not null check (kind in ('post', 'whisper')),
  target_id    bigint not null,
  reason       text not null check (reason in ('harassment', 'discrimination', 'safety', 'other')),
  note         text check (note is null or char_length(note) <= 500),
  excerpt      text,
  status       text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at   timestamptz not null default now(),
  handled_by   uuid references public.profiles(id) on delete set null,
  handled_at   timestamptz,
  handled_note text check (handled_note is null or char_length(handled_note) <= 500)
);
create unique index if not exists reports_one_open_idx
  on public.reports (reporter, kind, target_id) where status = 'open';
create index if not exists reports_status_idx on public.reports (status, created_at);
create index if not exists reports_reporter_idx on public.reports (reporter, created_at);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated
  using (reporter = auth.uid() or public.is_witch());

create or replace function public.cr_submit_report(p_kind text, p_target bigint, p_reason text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_about uuid; v_excerpt text; v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_reason not in ('harassment', 'discrimination', 'safety', 'other') then
    return jsonb_build_object('ok', false, 'code', 'bad_reason');
  end if;
  if v_note is not null and char_length(v_note) > 500 then v_note := left(v_note, 500); end if;

  if (select count(*) from public.reports
       where reporter = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('ok', false, 'code', 'too_many');
  end if;

  if p_kind = 'post' then
    select author_id, left(body, 800) into v_about, v_excerpt from public.posts where id = p_target;
    if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  elsif p_kind = 'whisper' then
    select case when t.user_a = auth.uid() then t.user_b else t.user_a end into v_about
      from public.dm_threads t
     where t.id = p_target and auth.uid() in (t.user_a, t.user_b);
    if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
    select string_agg(m.who || ': ' || left(m.body, 300), chr(10) order by m.created_at) into v_excerpt
      from (select p.handle as who, d.body, d.created_at
              from public.dm_messages d join public.profiles p on p.id = d.sender_id
             where d.thread_id = p_target order by d.created_at desc limit 8) m;
  else
    return jsonb_build_object('ok', false, 'code', 'bad_kind');
  end if;

  if v_about = auth.uid() then return jsonb_build_object('ok', false, 'code', 'self'); end if;

  insert into public.reports (reporter, about_user, kind, target_id, reason, note, excerpt)
  values (auth.uid(), v_about, p_kind, p_target, p_reason, v_note, v_excerpt)
  on conflict do nothing;
  if not found then return jsonb_build_object('ok', false, 'code', 'already'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_submit_report(text, bigint, text, text) from public, anon;
grant execute on function public.cr_submit_report(text, bigint, text, text) to authenticated;

create or replace function public.cr_resolve_report(p_id bigint, p_status text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'not_witch'); end if;
  if p_status not in ('actioned', 'dismissed') then
    return jsonb_build_object('ok', false, 'code', 'bad_status');
  end if;
  update public.reports
     set status = p_status, handled_by = auth.uid(), handled_at = now(),
         handled_note = left(nullif(btrim(coalesce(p_note, '')), ''), 500)
   where id = p_id and status = 'open';
  if not found then return jsonb_build_object('ok', false, 'code', 'gone'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_resolve_report(bigint, text, text) from public, anon;
grant execute on function public.cr_resolve_report(bigint, text, text) to authenticated;
