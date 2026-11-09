import { HISTORIKAL, RARITY_COLOR } from "@/lib/historikals";

/** A Historikal's picture with a hard outline in its rarity colour, one sprite pixel wide, just past its
 *  black border: no square, no haze. White for common, green, blue, purple, red for mythic. */
export function RarityGlow({ slug, size, children }: { slug: string; size: number; children: React.ReactNode }) {
  const h = HISTORIKAL.get(slug);
  if (!h) return <span style={{ display: "block", width: size, height: size, flex: "none" }}>{children}</span>;
  const c = RARITY_COLOR[h.rarity];
  // One sprite pixel wide: the sprite is 34 pixels across, so a 68px picture has 2px pixels. (It was one
  // screen pixel, half a sprite pixel on a phone: a hairline that looked broken.)
  const k = Math.max(1, Math.round(size / 34));
  return (
    <span className="hk-ring" style={{ display: "block", width: size, height: size, flex: "none", filter: `drop-shadow(${k}px 0 0 ${c}) drop-shadow(-${k}px 0 0 ${c}) drop-shadow(0 ${k}px 0 ${c}) drop-shadow(0 -${k}px 0 ${c})` }}>
      {children}
    </span>
  );
}
