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
      const W = GRID + 2, H = GRID + 2 + ABOVE;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      // The ring: the sprite's own alpha cast one pixel in all eight directions, filled with the colour.
      const ring = document.createElement("canvas"); ring.width = W; ring.height = GRID + 2;
      const rc = ring.getContext("2d");
      if (!rc) return;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) rc.drawImage(img, 1 + dx, 1 + dy);
      rc.globalCompositeOperation = "source-in"; rc.fillStyle = colour; rc.fillRect(0, 0, W, GRID + 2);
      const still = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(ring, 0, ABOVE); };
      still();
      if (!mythic || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // The flakes: from the top edge of each column, up a few rows, in the ring's red and a shade either side.
      const probe = document.createElement("canvas"); probe.width = GRID; probe.height = GRID;
      const pc = probe.getContext("2d");
      if (!pc) return;
      pc.drawImage(img, 0, 0);
      const data = pc.getImageData(0, 0, GRID, GRID).data;
      const edge: number[] = [];
      for (let x = 0; x < GRID; x++) { edge[x] = -1; for (let y = 0; y < GRID; y++) if (data[(y * GRID + x) * 4 + 3]) { edge[x] = y; break; } }
      const shades = [colour, colour, colour, "#c42833", "#a01c26"];
      type Flake = { x: number; y: number; vx: number; vy: number; w: number; c: string; age: number; life: number };
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
            flakes.push({ x: x + 1, y: edge[x] + ABOVE + 1 - 1 - Math.floor(Math.random() * 2), vx: (Math.random() - 0.5) * 0.06, vy: -(0.1 + Math.random() * 0.1), w: big ? 2 : 1, c: shades[Math.floor(Math.random() * shades.length)], age: 0, life: 20 + Math.random() * 15 });
          }
        }
        for (const f of flakes) { f.age++; f.x += f.vx; f.y += f.vy; }
        for (let i = flakes.length - 1; i >= 0; i--) if (flakes[i].age >= flakes[i].life || flakes[i].y < 0) flakes.splice(i, 1);
        still();
        for (const f of flakes) {
          ctx.globalAlpha = Math.max(0.35, 1 - f.age / f.life);
          ctx.fillStyle = f.c;
          ctx.fillRect(Math.round(f.x), Math.round(f.y), f.w, f.w);
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
