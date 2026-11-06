-- An article's picture is an icon from the same set the token designer uses, not an
-- uploaded file: articles.banner_icon holds its slug (null for none). The old banner flag
-- stays and now just says whether there is one.
--
-- cr_set_article_icon(id, slug) sets or clears it. A witch can on any article; the author
-- of an op-ed can on their own until it is published. The app checks the slug against the
-- icon list; here it only has to look like one.

alter table public.articles add column if not exists banner_icon text
  check (banner_icon is null or banner_icon ~ '^[a-z0-9-]{1,40}$');

create or replace function public.cr_set_article_icon(p_id bigint, p_icon text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record; v_icon text := nullif(btrim(coalesce(p_icon, '')), '');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if v_icon is not null and v_icon !~ '^[a-z0-9-]{1,40}$' then
    return jsonb_build_object('ok', false, 'code', 'bad_icon');
  end if;
  select id, kind, status, author_id into a from public.articles where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if not (public.is_witch()
          or (a.kind = 'oped' and a.author_id = auth.uid() and a.status in ('draft', 'pending', 'returned'))) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  update public.articles set banner_icon = v_icon, banner = (v_icon is not null) where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_set_article_icon(bigint, text) from public, anon;
grant execute on function public.cr_set_article_icon(bigint, text) to authenticated;
