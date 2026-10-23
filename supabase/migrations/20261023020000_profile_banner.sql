-- Profile banners: a pattern and two colours, chosen from fixed lists.
-- null means "the original" (night-purple diagonal stripes). The database holds only
-- these keys, never a free colour; lib/banner.ts maps them to the palette.
alter table public.profiles
  add column if not exists banner_pattern text,
  add column if not exists banner_a text,
  add column if not exists banner_b text;

alter table public.profiles
  add constraint profiles_banner_pattern_ok check (banner_pattern is null or banner_pattern in ('stripes-diagonal', 'stripes-straight', 'dots', 'checker', 'gradient')),
  add constraint profiles_banner_a_ok check (banner_a is null or banner_a in ('mag-dark', 'mag', 'mag-light', 'pur-dark', 'pur', 'pur-light', 'blu-dark', 'blu', 'blu-light', 'ink', 'night', 'slate', 'mist')),
  add constraint profiles_banner_b_ok check (banner_b is null or banner_b in ('mag-dark', 'mag', 'mag-light', 'pur-dark', 'pur', 'pur-light', 'blu-dark', 'blu', 'blu-light', 'ink', 'night', 'slate', 'mist'));
