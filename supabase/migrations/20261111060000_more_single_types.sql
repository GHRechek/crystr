-- More single-type Historikals, weighted to the bottom: half of commons, a third of uncommons, a quarter
-- of rares lose their second type (chosen by slug, so it is stable). Rollers and shifters keep both. Their
-- moves' elements follow: the dropped type becomes the first.
with pick as (
  select slug, types[1] keep, types[2] drop_t from public.badge_kinds
   where types is not null and array_length(types, 1) = 2 and not rnd and not shift
     and (abs(hashtext(slug || ':single')) % 100) < case rarity when 'common' then 50 when 'uncommon' then 33 when 'rare' then 25 else 0 end)
update public.badge_kinds k
   set types = array[p.keep],
       moves = (select jsonb_agg(m || jsonb_build_object('el', (select jsonb_agg(distinct case when t = p.drop_t then p.keep else t end) from jsonb_array_elements_text(m->'el') t)) order by o)
                  from jsonb_array_elements(k.moves) with ordinality x(m, o)),
       blurb = 'A ' || k.rarity || ' ' || initcap(p.keep) || ' Historikal.'
  from pick p where k.slug = p.slug;
