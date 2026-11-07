import { HISTORIKAL, RARITY_COLOR } from "@/lib/historikals";

/** A Historikal's picture with a hard outline in its rarity colour, one sprite pixel wide, just past its
 *  black border: no square, no haze. */
export function RarityGlow({ slug, size, children }: { slug: string; size: number; children: React.ReactNode }) {
  const h = HISTORIKAL.get(slug);
  // Commons go without.
  if (!h || h.rarity === "common") return <span style={{ display: "block", width: size, height: size, flex: "none" }}>{children}</span>;
  const c = RARITY_COLOR[h.rarity];
  const k = Math.max(1, Math.round(size / 50));
  return (
    <span className="hk-ring" style={{ display: "block", width: size, height: size, flex: "none", filter: `drop-shadow(${k}px 0 0 ${c}) drop-shadow(-${k}px 0 0 ${c}) drop-shadow(0 ${k}px 0 ${c}) drop-shadow(0 -${k}px 0 ${c})` }}>
      {children}
    </span>
  );
}
