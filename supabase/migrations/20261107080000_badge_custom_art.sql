-- A badge's picture can be one drawn in the token maker: art = 'token:<packed design>' (the packed
-- form /token/<packed>.png draws). cr_badge_save takes the packed design as a sixth argument.
drop function if exists public.cr_badge_save(text, text, text, text, int);
create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int, p_art_custom text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
        v_art text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_art_custom is not null and p_art_custom ~ '^[0-9a-z.]{1,120}$' then
    v_art := 'token:' || p_art_custom;
  elsif p_art is not null and p_art between 1 and 299 then
    v_art := 'set/' || p_art || '.png';
  end if;
  if char_length(v_title) not between 1 and 40 or char_length(v_how) not between 1 and 200
     or char_length(v_blurb) not between 1 and 120 or v_art is null then
    return jsonb_build_object('ok', false, 'code', 'bad_input');
  end if;
  if p_slug is not null then
    update public.badges set title = v_title, how = v_how, blurb = v_blurb, art = v_art where slug = p_slug;
    if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'badge'; end if;
  v_slug := left(v_base, 40);
  while exists (select 1 from public.badges where slug = v_slug) loop
    v_n := v_n + 1; v_slug := left(v_base, 36) || '-' || v_n;
  end loop;
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved)
  values (v_slug, v_title, v_how, v_blurb, v_art, (select coalesce(max(sort), 0) + 1 from public.badges), true, true);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;
revoke all on function public.cr_badge_save(text, text, text, text, int, text) from public, anon;
grant execute on function public.cr_badge_save(text, text, text, text, int, text) to authenticated;
