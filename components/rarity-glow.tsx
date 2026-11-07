import { HISTORIKAL, RARITY_COLOR } from "@/lib/historikals";

/** A Historikal's picture with its rarity as a soft glow behind it: no square, just light. */
export function RarityGlow({ slug, size, children }: { slug: string; size: number; children: React.ReactNode }) {
  const h = HISTORIKAL.get(slug);
  if (!h) return <>{children}</>;
  const c = RARITY_COLOR[h.rarity];
  return (
    <span style={{ position: "relative", display: "block", width: size, height: size, flex: "none" }}>
      <span aria-hidden style={{ position: "absolute", inset: "-14%", borderRadius: "50%", background: `radial-gradient(circle, ${c} 0%, ${c}99 28%, transparent 66%)`, opacity: h.rarity === "common" ? 0.4 : 0.68, filter: `blur(${Math.max(3, Math.round(size * 0.07))}px)`, pointerEvents: "none" }} />
      <span style={{ position: "relative", display: "block" }}>{children}</span>
    </span>
  );
}
