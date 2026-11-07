"use client";

import { useEffect, useState } from "react";
import { RarityGlow } from "@/components/rarity-glow";

/** A badge or Historikal picture. A Historikal (/creatures/<slug>.png) idles between its two frames,
 *  twice a second; anything else is just the picture. */
export function IdleImg({ src, size, style }: { src: string; size: number; style?: React.CSSProperties }) {
  const creature = /^\/creatures\/([a-z0-9-]+)\.png$/.exec(src)?.[1];
  const [two, setTwo] = useState(false);
  useEffect(() => {
    if (!creature || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setTwo((x) => !x), 500);
    return () => window.clearInterval(t);
  }, [creature]);
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={creature && two ? `/creatures/${creature}-2.png` : src} alt="" width={size} height={size} style={{ display: "block", imageRendering: "pixelated", ...style }} />;
  return creature ? <RarityGlow slug={creature} size={size}>{img}</RarityGlow> : img;
}
