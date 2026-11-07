import { HISTORIKAL, RARITY_COLOR } from "@/lib/historikals";

/** A Historikal's picture with its rarity as a tight glow hugging its outline: no square, no haze. */
export function RarityGlow({ slug, size, children }: { slug: string; size: number; children: React.ReactNode }) {
  const h = HISTORIKAL.get(slug);
  if (!h) return <>{children}</>;
  const c = RARITY_COLOR[h.rarity];
  const r = Math.max(2, Math.round(size * 0.035));
  return (
    <span style={{ display: "block", width: size, height: size, flex: "none", filter: `drop-shadow(0 0 ${r}px ${c}) drop-shadow(0 0 ${Math.max(1, r / 2)}px ${c})` }}>
      {children}
    </span>
  );
}
