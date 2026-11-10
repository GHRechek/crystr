-- Batwing Slime: Tide is its fixed second type and only its first type rolls (it was the other way round).
-- Its art is redrawn with Dark leading. Copies already rolled (Nature, Spirit) keep their roll; a copy that
-- had rolled Tide, which now cannot be, rolls again.
update public.badge_kinds set types = array['dark', 'tide'], element = 'dark', blurb = 'An uncommon Dark/Tide Historikal.', moves = '[{"name": "Soul Bite", "kind": "sword"}, {"name": "Tide Pool", "kind": "armor"}]'::jsonb where slug = 'batwing-slime';
update public.badge_items set rolled = null where kind_slug = 'batwing-slime' and rolled = 'tide';
update public.badge_items i set rolled = (array['fire', 'nature', 'ward', 'dark', 'spirit'])[1 + floor(random() * 5)::int] where kind_slug = 'batwing-slime' and rolled is null and kind = 'tradable';
