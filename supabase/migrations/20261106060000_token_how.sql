-- A token carries a line its maker writes: how to earn it. It is shown beside the token when
-- someone lists it under "Working on".
alter table public.tokens add column if not exists how text check (how is null or char_length(how) <= 140);

drop function if exists public.cr_set_token(jsonb);
create or replace function public.cr_set_token(p_design jsonb, p_how text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_how text := nullif(btrim(coalesce(p_how, '')), '');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_design is null or jsonb_typeof(p_design) <> 'object' or pg_column_size(p_design) > 2048 then
    return jsonb_build_object('ok', false, 'code', 'bad_design');
  end if;
  insert into public.tokens (user_id, design, how) values (auth.uid(), p_design, left(v_how, 140))
  on conflict (user_id) do update set design = excluded.design, how = excluded.how, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_set_token(jsonb, text) from public, anon;
grant execute on function public.cr_set_token(jsonb, text) to authenticated;
