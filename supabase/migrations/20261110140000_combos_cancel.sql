-- Two combinations against each other cancel out, whichever they are: neither lands, as two of a kind.
create or replace function public.cr_kind_score(a text, b text) returns int language sql immutable as $$
  select case when a like '%+%' and b like '%+%' then 0 else
    coalesce((select sum(case when (x, y) in (('sword', 'spell'), ('spell', 'armor'), ('armor', 'sword')) then 1
                              when (y, x) in (('sword', 'spell'), ('spell', 'armor'), ('armor', 'sword')) then -1 else 0 end)
                from unnest(string_to_array(a, '+')) x, unnest(string_to_array(b, '+')) y), 0)::int end;
$$;
