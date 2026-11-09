"use client";

import { useEffect, useRef } from "react";
import { HISTORIKAL, RARITY_COLOR } from "@/lib/historikals";

const GRID = 34;   // the sprite files are 34×34 (a 32px sprite with a 1px margin)
const ABOVE = 8;   // rows of room above the sprite, for a mythic's flakes

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
      // Everything is drawn on a half-pixel grid (S = 2 canvas pixels per sprite pixel): the ring is one sprite
      // pixel wide, its inner half solid and its outer half at half strength.
      const S = 2, W = (GRID + 2) * S, H = (GRID + 2 + ABOVE) * S, RH = (GRID + 2) * S;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const cast = (reach: number, alpha: number) => {
        const c = document.createElement("canvas"); c.width = W; c.height = RH;
        const g = c.getContext("2d");
        if (!g) return c;
        g.imageSmoothingEnabled = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) g.drawImage(img, S + dx * reach, S + dy * reach, GRID * S, GRID * S);
        g.globalCompositeOperation = "source-in"; g.globalAlpha = alpha; g.fillStyle = colour; g.fillRect(0, 0, W, RH);
        return c;
      };
      const outer = cast(S, 0.5), inner = cast(S / 2, 1);
      const still = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(outer, 0, ABOVE * S); ctx.drawImage(inner, 0, ABOVE * S); };
      still();
      if (!mythic || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // The flakes: from the top edge of each column, up a few rows, in the ring's red, solid or half strength.
      const probe = document.createElement("canvas"); probe.width = GRID; probe.height = GRID;
      const pc = probe.getContext("2d");
      if (!pc) return;
      pc.drawImage(img, 0, 0);
      const data = pc.getImageData(0, 0, GRID, GRID).data;
      const edge: number[] = [];
      for (let x = 0; x < GRID; x++) { edge[x] = -1; for (let y = 0; y < GRID; y++) if (data[(y * GRID + x) * 4 + 3]) { edge[x] = y; break; } }
      type Flake = { x: number; y: number; vx: number; vy: number; w: number; a: number; age: number; life: number };
      const flakes: Flake[] = [];
      let last = 0;
      const tick = (t: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(tick);
        if (t - last < 1000 / 30) return;   // thirty steps a second is plenty for pixels
        last = t;
        if (Math.random() < 0.55) {
          const x = Math.floor(Math.random() * GRID);
          if (edge[x] >= 0) {
            const big = Math.random() < 0.2;
            flakes.push({ x: x + 1, y: edge[x] + ABOVE - Math.floor(Math.random() * 2), vx: (Math.random() - 0.5) * 0.06, vy: -(0.1 + Math.random() * 0.1), w: big ? 2 : 1, a: Math.random() < 0.5 ? 1 : 0.5, age: 0, life: 20 + Math.random() * 15 });
          }
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
