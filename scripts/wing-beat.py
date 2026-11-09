# The wing beat: builds each winged Historikal's second idle frame (<slug>-2.png, and <slug>--<type>-2.png for
# the ones that roll a type) from its first, moving the wing pixels up. Masks live in
# scripts/historikals/wings/masks.json: slug -> {"wing": "x,y,k;...", "pin": "x,y;...", "breath": bool, "keep": bool}
# in 32-px sprite coordinates (the files have a 1-px margin). k is how far a pixel lifts (1 or 2); pinned pixels
# are body. Body pixels stay (with "breath", the body's top 3/4 dips a pixel); a wing pixel never lands on body;
# a vacated wing pixel keeps its original only where something still sits right under it, so the root stays
# joined and the rest lifts clear ("keep": every vacated pixel keeps its original).
#   python3 scripts/wing-beat.py            # all masks
#   python3 scripts/wing-beat.py bat harpy  # some
import json, sys, os, glob
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
MASKS = f"{here}/historikals/wings/masks.json"; OUT = f"{root}/public/creatures"
def parse(m, W, H):
    k = [[0] * W for _ in range(H)]
    for t in filter(None, m.get("wing", "").split(";")):
        x, y, v = t.split(","); x, y = int(x) + 1, int(y) + 1
        if 0 <= x < W and 0 <= y < H: k[y][x] = int(v)
    for t in filter(None, m.get("pin", "").split(";")):
        x, y = t.split(","); x, y = int(x) + 1, int(y) + 1
        if 0 <= x < W and 0 <= y < H: k[y][x] = 0
    return k
def beat(im, m):
    src = im.load(); W, H = im.size; k = parse(m, W, H)
    out = Image.new("RGBA", im.size); o = out.load()
    wing = lambda x, y: k[y][x] > 0
    ys = [y for y in range(H) for x in range(W) if src[x, y][3]]
    cut = (min(ys) + int((max(ys) + 1 - min(ys)) * 0.75)) if ys else 0
    for y in range(H):
        for x in range(W):
            if not src[x, y][3] or wing(x, y): continue
            ny = y + 1 if m.get("breath") and y < cut else y
            if ny < H: o[x, ny] = src[x, y]
    for y in range(H):
        for x in range(W):
            if not src[x, y][3] or not wing(x, y): continue
            ny = y - k[y][x]
            if ny < 0 or (o[x, ny][3] and not wing(x, ny)): continue
            o[x, ny] = src[x, y]
    for y in range(H):
        for x in range(W):
            if not src[x, y][3] or not wing(x, y) or o[x, y][3]: continue
            if m.get("keep") or (y + 1 < H and o[x, y + 1][3]): o[x, y] = src[x, y]
    return out
if __name__ == "__main__":
    M = json.load(open(MASKS)); only = sys.argv[1:]; n = 0
    for slug, m in M.items():
        if only and slug not in only: continue
        for base in [f"{OUT}/{slug}.png"] + sorted(glob.glob(f"{OUT}/{slug}--*.png")):
            if base.endswith("-2.png") or base.endswith("-s.png"): continue
            beat(Image.open(base).convert("RGBA"), m).save(base[:-4] + "-2.png"); n += 1
    print(f"{n} frames")
