"""Pull the app's icons out of the "1000 Pixel Art Icons" pack and tint the move icons per element.

    python3 scripts/pack-icons.py /path/to/1000-Pixel-Art-Icons

Writes public/icons/type-<element>.png (as drawn) and public/icons/move-<kind>[-<element>].png, the move icons
hue-shifted onto the element's colour (lightness kept, so the drawing survives; the dark outline is left alone).
"""
import colorsys, os, sys
from PIL import Image

PACK = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
ELEMENT_COLOR = {"fire": "#ff6a3d", "tide": "#3fa9f5", "nature": "#6fa86a", "ward": "#a7abb6", "feral": "#b0865f", "dark": "#8a6fd9", "spirit": "#f2e2a2"}
TYPES = {"fire": ("Nature", 31), "tide": ("Nature", 19), "nature": ("Nature", 86), "ward": ("Weapons", 74), "feral": ("Animals", 3), "dark": ("Nature", 5), "spirit": ("Smileys & People", 118)}
MOVES = {"sword": ("Objects", 299), "spell": ("Smileys & People", 152), "armor": ("Smileys & People", 165)}

def pick(cat, n):
    return Image.open(os.path.join(PACK, cat, "16x16px", f"{cat} {n}.png")).convert("RGBA")

def tint(img, hex_):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    th, tl, ts = colorsys.rgb_to_hls(r, g, b)
    out = img.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s < 0.15 or l < 0.2: continue  # outline and deep shadow stay
            if ts < 0.15: s2 = s * 0.25  # a grey element (ward): wash the colour out instead
            else: s2 = max(s, min(0.85, ts + 0.15))
            r2, g2, b2 = colorsys.hls_to_rgb(th, l, s2)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

os.makedirs(OUT, exist_ok=True)
for el, (c, n) in TYPES.items(): pick(c, n).save(os.path.join(OUT, f"type-{el}.png"))
for kind, (c, n) in MOVES.items():
    im = pick(c, n); im.save(os.path.join(OUT, f"move-{kind}.png"))
    for el, col in ELEMENT_COLOR.items(): tint(im, col).save(os.path.join(OUT, f"move-{kind}-{el}.png"))
print("wrote", len(os.listdir(OUT)), "icons")
