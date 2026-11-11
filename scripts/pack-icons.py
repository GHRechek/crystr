"""Pull the app's icons out of the "1000 Pixel Art Icons" pack and tint the move icons per element.

    python3 scripts/pack-icons.py /path/to/1000-Pixel-Art-Icons

Writes public/icons/type-<element>.png (in the element's colour) and public/icons/move-<kind>[-<element>].png, the move icons
hue-shifted onto the element's colour (lightness kept, so the drawing survives; the dark outline is left alone).
"""
import colorsys, os, sys
from PIL import Image

PACK = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
ELEMENT_COLOR = {"fire": "#ff6a3d", "tide": "#3fa9f5", "nature": "#6fa86a", "ward": "#a7abb6", "feral": "#b0865f", "dark": "#8a6fd9", "spirit": "#f2e2a2"}
TYPES = {"fire": ("Nature", 8), "tide": ("Nature", 20), "nature": ("Nature", 101), "ward": ("Weapons", 71), "feral": ("Animals", 1), "dark": ("Symbols", 158), "spirit": ("Nature", 6)}
MOVES = {"sword": ("Weapons", 3), "spell": ("Smileys & People", 152), "armor": ("Smileys & People", 165)}

# The pack outlines everything in a dusky purple (#442434); the app wants it darker.
OUTLINE_FROM, OUTLINE_TO = (0x44, 0x24, 0x34), (0x16, 0x0a, 0x1e)

def pick(cat, n):
    im = Image.open(os.path.join(PACK, cat, "16x16px", f"{cat} {n}.png")).convert("RGBA"); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if (r, g, b) == OUTLINE_FROM: px[x, y] = (*OUTLINE_TO, a)
    return im

def tint_type(img, hex_):
    """A type icon in its element's colour: every pixel but the outline takes the hue, and the very dark ones
    (the paw print) come up to a middle lightness so the colour shows."""
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    th, tl, ts = colorsys.rgb_to_hls(r, g, b)
    out = img.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a or (r, g, b) == OUTLINE_TO: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if l > 0.92 and s < 0.2: continue  # white glints stay white
            # Lean on the element's own colour: its saturation, and part way to its lightness (cream stays cream).
            l2 = max(l, 0.36) if l < 0.2 else l
            l2 = l2 + (tl - l2) * 0.35
            s2 = s * 0.3 if ts < 0.15 else min(0.95, ts * 0.9 + s * 0.1)
            r2, g2, b2 = colorsys.hls_to_rgb(th, l2, s2)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

def tint(img, hex_):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    th, tl, ts = colorsys.rgb_to_hls(r, g, b)
    out = img.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if (r, g, b) == OUTLINE_TO or l < 0.2: continue  # outline and deep shadow stay
            if ts < 0.15: s2 = s * 0.25  # a grey element (ward): wash the colour out instead
            else: s2 = min(0.92, ts * 0.8 + s * 0.2) if s >= 0.15 else min(0.7, ts)  # the element's own saturation, grey steel included
            l2 = l + (tl - l) * 0.45  # and part way to its lightness, so cream reads cream
            r2, g2, b2 = colorsys.hls_to_rgb(th, l2, s2)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

os.makedirs(OUT, exist_ok=True)
for el, (c, n) in TYPES.items(): tint_type(pick(c, n), ELEMENT_COLOR[el]).save(os.path.join(OUT, f"type-{el}.png"))
for kind, (c, n) in MOVES.items():
    im = pick(c, n); im.save(os.path.join(OUT, f"move-{kind}.png"))
    for el, col in ELEMENT_COLOR.items(): tint(im, col).save(os.path.join(OUT, f"move-{kind}-{el}.png"))
print("wrote", len(os.listdir(OUT)), "icons")
