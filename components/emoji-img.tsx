"use client";

import { useEffect, useState } from "react";
import { hasSkin, skinRamp } from "@/lib/emoji-skin";

const made = new Map<string, string>();

/** A pixel emoji, its yellow skin recoloured to `skin` (a face-maker skin colour). Drawn once per
 *  emoji and skin on a canvas from the small 16px original, then reused. */
export function EmojiImg({ e, skin, size = 24, style }: { e: string; skin?: string | null; size?: number; style?: React.CSSProperties }) {
  const plain = `/emoji/${e}.png`;
  const key = skin && hasSkin(e) ? `${e}:${skin}` : "";
  const [src, setSrc] = useState(key && made.get(key) ? made.get(key)! : plain);

  useEffect(() => {
    if (!key || !skin) return;
    const have = made.get(key);
    if (have) {
      setSrc(have);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const ramp = skinRamp(skin);
      const hex = (n: number) => n.toString(16).padStart(2, "0");
      for (let i = 0; i < d.data.length; i += 4) {
        if (!d.data[i + 3]) continue;
        const to = ramp[`#${hex(d.data[i])}${hex(d.data[i + 1])}${hex(d.data[i + 2])}`];
        if (!to) continue;
        d.data[i] = parseInt(to.slice(1, 3), 16);
        d.data[i + 1] = parseInt(to.slice(3, 5), 16);
        d.data[i + 2] = parseInt(to.slice(5, 7), 16);
      }
      ctx.putImageData(d, 0, 0);
      const url = c.toDataURL("image/png");
      made.set(key, url);
      setSrc(url);
    };
    img.src = `/emoji/${e}-s.png`;
  }, [key, skin, e]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} style={{ imageRendering: "pixelated", ...style }} />;
}
