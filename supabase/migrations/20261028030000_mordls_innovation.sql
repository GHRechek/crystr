-- On MORDLs, "Restricted Lifespans" reads "Drivers of Innovation" instead. Same slot, same
-- author; a page without the old words is left alone.
update public.wiki_facts f
   set body = 'Drivers of Innovation'
  from public.wiki_pages p
 where p.id = f.page_id and p.slug = 'mordls' and f.status = 'kept' and lower(f.body) = 'restricted lifespans';
