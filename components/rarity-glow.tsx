"use client";

import { useEffect, useRef } from "react";
import { HISTORIKAL, RARITY_COLOR } from "@/lib/historikals";

const GRID = 34;   // the sprite files are 34×34 (a 32px sprite with a 1px margin)
const ABOVE = 28;  // rows of room above the sprite: the flakes climb well clear of it, for a mythic's flakes

/** A Historikal's picture with a hard outline in its rarity colour, one sprite pixel wide, just past its black
 *  border: white, green, blue, purple, red for mythic. A mythic also has flakes of that red rising off its top.
 *  Drawn on a canvas from the frame being shown (`src`), not with a CSS filter: WebKit drops a filter when the
 *  picture underneath changes frame, which lost the ring on everything that moves. */
export function RarityGlow({ slug, size, src, children }: { slug: string; size: number; src?: string; children: React.ReactNode }) {
  const h = HISTORIKAL.get(slug);
  const colour = h ? RARITY_COLOR[h.rarity] : null;
  const mythic = h?.rarity === "legendary";
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !colour || !src) return;
    let alive = true, raf = 0;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      // Everything is drawn at S canvas pixels per sprite pixel.
      const S = 4, W = (GRID + 2) * S, H = (GRID + 2 + ABOVE) * S, RH = (GRID + 2) * S;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      // The ring, on the pixel grid: every empty pixel beside a sprite pixel (up, down, left, right), plus the
      // diagonal corners of sprite pixels that sit in a mass (two or more neighbours), so solid edges run
      // unbroken while one-pixel points (horns, wing tips, tails) stay rounded instead of squared off.
      const probe = document.createElement("canvas"); probe.width = GRID; probe.height = GRID;
      const pc = probe.getContext("2d");
      if (!pc) return;
      pc.drawImage(img, 0, 0);
      const data = pc.getImageData(0, 0, GRID, GRID).data;
      const on = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && data[(y * GRID + x) * 4 + 3] > 0;
      // Each ring pixel is a thin solid line on its inner quarter (against the sprite) with the rest at half
      // strength, a glow; a corner pixel, touching the sprite only diagonally, is all glow.
      const ring = document.createElement("canvas"); ring.width = W; ring.height = RH;
      const rg = ring.getContext("2d");
      if (!rg) return;
      rg.fillStyle = colour;
      const hs = S / 4;
      const mark = (x: number, y: number) => {
        if (on(x, y)) return;
        const px = (x + 1) * S, py = (y + 1) * S;
        rg.globalAlpha = 0.5; rg.fillRect(px, py, S, S);
        rg.globalAlpha = 1;
        if (on(x, y + 1)) rg.fillRect(px, py + S - hs, S, hs);    // sprite below: the bottom sliver is solid
        else if (on(x, y - 1)) rg.fillRect(px, py, S, hs);        // above: the top sliver
        else if (on(x + 1, y)) rg.fillRect(px + S - hs, py, hs, S); // right: the right sliver
        else if (on(x - 1, y)) rg.fillRect(px, py, hs, S);        // left: the left sliver
      };
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
        if (!on(x, y)) continue;
        mark(x + 1, y); mark(x - 1, y); mark(x, y + 1); mark(x, y - 1);
        const mass = [on(x + 1, y), on(x - 1, y), on(x, y + 1), on(x, y - 1)].filter(Boolean).length >= 2;
        if (mass) { mark(x + 1, y + 1); mark(x - 1, y + 1); mark(x + 1, y - 1); mark(x - 1, y - 1); }
      }
      rg.globalAlpha = 1;
      const still = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(ring, 0, ABOVE * S); };
      still();
      if (!mythic || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // The flakes: from the top edge of each column, up a few rows, in the ring's red, solid or half strength.
      // Where flakes start: the top edge of each column, and the sides of the upper half (shoulders, wing edges).
      const edge: number[] = [];
      for (let x = 0; x < GRID; x++) { edge[x] = -1; for (let y = 0; y < GRID; y++) if (data[(y * GRID + x) * 4 + 3]) { edge[x] = y; break; } }
      const tops = edge.filter((y) => y >= 0); const topMost = tops.length ? Math.min(...tops) : 0;
      let botMost = topMost; for (let y = GRID - 1; y >= 0; y--) { if (edge.some((e, x) => e >= 0 && data[(y * GRID + x) * 4 + 3])) { botMost = y; break; } }
      const sides: [number, number][] = [];
      for (let y = topMost; y <= topMost + (botMost - topMost) / 2; y++) {
        let l = -1, r = -1;
        for (let x = 0; x < GRID; x++) if (data[(y * GRID + x) * 4 + 3]) { if (l < 0) l = x; r = x; }
        if (l >= 0) { sides.push([l - 1, y]); sides.push([r + 1, y]); }
      }
      type Flake = { x: number; y: number; vx: number; vy: number; w: number; a: number; age: number; life: number };
      const flakes: Flake[] = [];
      let last = 0;
      const tick = (t: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(tick);
        if (t - last < 1000 / 30) return;   // thirty steps a second is plenty for pixels
        last = t;
        for (let n = 1.4; n > 0; n -= 1) {
          if (Math.random() >= Math.min(1, n)) continue;
          let sx = -1, sy = 0;
          if (Math.random() < 0.6 || !sides.length) { const x = Math.floor(Math.random() * GRID); if (edge[x] >= 0) { sx = x; sy = edge[x] - 1 - Math.floor(Math.random() * 2); } }
          else { const p = sides[Math.floor(Math.random() * sides.length)]; sx = p[0]; sy = p[1]; }
          if (sx < 0) continue;
          const big = Math.random() < 0.2;
          flakes.push({ x: sx + 1, y: sy + ABOVE + 1, vx: (Math.random() - 0.5) * 0.08, vy: -(0.2 + Math.random() * 0.2), w: big ? 2 : 1, a: Math.random() < 0.65 ? 1 : 0.5, age: 0, life: 40 + Math.random() * 30 });
        }
        for (const f of flakes) { f.age++; f.x += f.vx; f.y += f.vy; }
        for (let i = flakes.length - 1; i >= 0; i--) if (flakes[i].age >= flakes[i].life || flakes[i].y < 0) flakes.splice(i, 1);
        still();
        ctx.fillStyle = colour;
        for (const f of flakes) {
          ctx.globalAlpha = f.a * Math.max(0.5, 1 - f.age / f.life);
          ctx.fillRect(Math.round(f.x) * S, Math.round(f.y) * S, f.w * S, f.w * S);
        }
        ctx.globalAlpha = 1;
      };
      raf = requestAnimationFrame(tick);
    };
    img.src = src;
    return () => { alive = false; if (raf) cancelAnimationFrame(raf); };
  }, [src, colour, mythic]);

  if (!h || !colour) return <span style={{ display: "block", width: size, height: size, flex: "none" }}>{children}</span>;
  const px = size / GRID;
  return (
    <span className="hk-ring" style={{ display: "block", width: size, height: size, flex: "none", position: "relative" }}>
      <canvas ref={ref} aria-hidden style={{ position: "absolute", left: -px, top: -px * (1 + ABOVE), width: px * (GRID + 2), height: px * (GRID + 2 + ABOVE), imageRendering: "pixelated", pointerEvents: "none" }} />
      <span style={{ position: "relative", display: "block", width: size, height: size }}>{children}</span>
    </span>
  );
}
