"use client";

import { useEffect, useState } from "react";
import { RarityGlow } from "@/components/rarity-glow";
import { HISTORIKAL } from "@/lib/historikals";
import { spriteUrl } from "@/lib/sprites";

/** A badge or Historikal picture. A Historikal (/creatures/<slug>.png) idles between its two frames,
 *  twice a second; anything else is just the picture. */
export function IdleImg({ src, size, style }: { src: string; size: number; style?: React.CSSProperties }) {
  // /creatures/<slug>.png, or /creatures/<slug>--<type>.png for a copy that rolled its type.
  const m = /^\/creatures\/([a-z0-9]+(?:-[a-z0-9]+)*)(--[a-z]+)?\.png$/.exec(src);
  const creature = m?.[1], variant = m?.[2] ?? "";
  const [two, setTwo] = useState(false);
  useEffect(() => {
    if (!creature || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setTwo((x) => !x), 500);
    return () => window.clearInterval(t);
  }, [creature]);
  // A witch's edit in the app stands in for either frame.
  const file = creature ? `${creature}${variant}${two ? "-2" : ""}.png` : "";
  const shown = creature ? spriteUrl(`creatures/${file}`) ?? `/creatures/${file}` : src;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={shown} alt="" width={size} height={size} style={{ display: "block", imageRendering: "pixelated", ...style }} />;
  if (!creature) return img;
  // The ring goes inside the bob, not around it: Safari drops a filter on the parent of an animated child.
  const ringed = <RarityGlow slug={creature} size={size} src={shown}>{img}</RarityGlow>;
  return HISTORIKAL.get(creature)?.hover ? <span className="hk-hover">{ringed}</span> : ringed;
}
