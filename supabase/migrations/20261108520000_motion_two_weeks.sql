-- Motions can run for two weeks too.
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_create_motion(text, text, text, integer, text, text, text, text, boolean)'::regprocedure) into d;
  n := length(d);
  d := replace(d, 'if m_hours not in (4, 24, 72) then', 'if m_hours not in (4, 24, 72, 336) then');
  if length(d) = n then raise exception 'cr_create_motion: window patch did not apply'; end if;
  execute d;
end
$do$;
