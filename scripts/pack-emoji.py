"""Redraw the app's pixel emoji from the "1000 Pixel Art Icons" pack.

    python3 scripts/pack-emoji.py /path/to/1000-Pixel-Art-Icons

The seventy reaction emoji keep their keys (pm-<n>: the database only accepts those), but the ones the pack has
are written over with its drawing: public/emoji/pm-<n>-s.png (16px, outline darkened) and pm-<n>.png (48px).
Faces and hands the pack has beyond those are written as pk-<n> (the pack's own number) for emoji in text.
"""
import os, sys
from PIL import Image

PACK = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "emoji")
P = "Smileys & People"
# pm-<n> -> the pack picture that draws the same emoji. Missing ones keep the old drawing.
REPLACE = {
    1: (P, 87), 2: (P, 3), 3: (P, 37), 4: (P, 46), 5: (P, 72), 6: (P, 24), 7: (P, 69), 8: (P, 56), 9: (P, 1), 10: (P, 2),
    11: (P, 4), 12: (P, 11), 13: (P, 6), 14: (P, 90), 15: (P, 9), 16: (P, 60), 17: (P, 65), 18: (P, 86), 19: (P, 43), 20: (P, 52),
    21: (P, 8), 22: (P, 26), 23: (P, 25), 24: (P, 89), 25: (P, 18), 26: (P, 64), 28: (P, 49),
    30: ("Symbols", 117), 31: ("Symbols", 127), 32: ("Symbols", 116), 35: ("Symbols", 245), 37: ("Symbols", 121), 38: ("Objects", 303),
    39: (P, 115), 41: ("Symbols", 126), 42: ("Nature", 6), 43: ("Symbols", 123), 44: ("Symbols", 120),
    45: (P, 172), 46: (P, 187), 48: (P, 186), 50: (P, 163), 52: (P, 155), 53: (P, 166), 54: (P, 151), 55: (P, 149),
    56: (P, 120), 57: ("Animals", 8), 58: (P, 196), 59: ("Nature", 31), 60: ("Nature", 63), 63: (P, 127), 64: (P, 122), 65: ("Nature", 10),
    67: (P, 206), 68: ("Objects", 342), 69: ("Food", 153), 70: ("Travel & Places", 99),
}
# More of the pack's faces and hands, by its own number, for emoji written in text (not reactions).
EXTRA = [5, 7, 10, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 27, 29, 30, 31, 32, 33, 35, 36, 38, 39, 40, 41, 42, 44, 45, 47, 48, 50, 51, 53, 54, 55, 57, 58, 59, 61, 62, 63, 66, 67, 68, 70, 71, 73, 76, 78, 79, 80, 81, 82, 83, 84, 85, 91, 92, 93, 94, 95, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
         116, 118, 121, 123, 124, 144, 146, 148, 152, 153, 154, 157, 158, 160, 162, 164, 165, 167, 168, 169, 170, 171, 174, 176, 177, 178, 185, 188, 192, 193, 194, 197, 203, 207, 209]

def pick(cat, n):
    im = Image.open(os.path.join(PACK, cat, "16x16px", f"{cat} {n}.png")).convert("RGBA"); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if (r, g, b) == (0x44, 0x24, 0x34): px[x, y] = (0x0b, 0x05, 0x10, a)
    return im

def write(key, im):
    im.save(os.path.join(OUT, f"{key}-s.png"), optimize=True)
    im.resize((48, 48), Image.NEAREST).save(os.path.join(OUT, f"{key}.png"), optimize=True)

for n, (c, k) in REPLACE.items(): write(f"pm-{n}", pick(c, k))
for k in EXTRA: write(f"pk-{k}", pick(P, k))
print("replaced", len(REPLACE), "added", len(EXTRA))
