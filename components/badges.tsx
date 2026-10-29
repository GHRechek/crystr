import { BADGE_GLYPH, itemTitle, type BadgeItem, type BadgeRow, type TradeItem } from "@/lib/badges";
import { BADGE_MANA, HELPS_PER_BADGE } from "@/lib/crystr";
import { normalizeToken, tokenSrc } from "@/lib/token";

/** A 3x5 pixel face for the count inside the heart. */
const GLYPHS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "/": ["001", "001", "010", "100", "100"],
};

/** "2/5" drawn in white pixels inside the heart of A HELPING HAND: how far to the next
 *  tradable badge. The heart fills columns 4–16 and rows 5–15 of the 21-cell art; three
 *  glyphs with a gap between fill eleven columns, so they sit from column 5, rows 7–11. */
export function HeartProgress({ done, of = HELPS_PER_BADGE }: { done: number; of?: number }) {
  const text = `${Math.max(0, Math.min(9, done))}/${of}`;
  const cells: React.ReactNode[] = [];
  let x = 5;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) continue;
    g.forEach((row, dy) =>
      [...row].forEach((c, dx) => {
        if (c === "1") cells.push(<rect key={`${x + dx}-${7 + dy}`} x={x + dx} y={7 + dy} width={1} height={1} />);
      }),
    );
    x += 4;
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 21 21"
      shapeRendering="crispEdges"
      fill="#fff"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      {cells}
    </svg>
  );
}

/** What a tier wears: nothing at I, then a ring round the frame in blue, purple, magenta. */
const TIER_RING: Record<number, string | undefined> = {
  2: "var(--blu-soft)",
  3: "var(--pur-soft)",
  4: "var(--mag-soft)",
};

/** Four pips along the bottom of the frame, one lit per tier held: the art is 20 or 21
 *  cells with a dark frame line three cells up from the bottom edge, so the pips sit in
 *  it, two cells wide each with a cell between, centred. */
function TierPips({ tier, cells }: { tier: number; cells: number }) {
  const y = cells - 3;
  const x0 = Math.floor((cells - 11) / 2);
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${cells} ${cells}`}
      shapeRendering="crispEdges"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x0 + i * 3} y={y} width={2} height={1} fill={i < tier ? "#fff" : "#575a66"} />
      ))}
    </svg>
  );
}

/** The art of an achievement badge at twice its size, greyed until earned. With `progress`
 *  (the helping-hand badge only), the count to the next tradable badge sits in the heart.
 *  With `tier` (a badge that steps up), the pips in the frame show the tier held and from
 *  II a ring in the tier's colour goes round it. */
export function BadgeArt({
  b,
  got,
  progress,
  tier,
}: {
  b: Pick<BadgeRow, "art" | "slug"> & Partial<Pick<BadgeRow, "tiers">>;
  got: boolean;
  progress?: number;
  tier?: number;
}) {
  const tiered = (b.tiers ?? 1) > 1 && got && tier !== undefined && tier > 0;
  const ring = tiered ? TIER_RING[tier] : undefined;
  if (!b.art) {
    return (
      <div
        aria-hidden
        style={{
          width: 42,
          height: 42,
          flex: "none",
          display: "grid",
          placeItems: "center",
          fontSize: 16,
          color: got ? "var(--mag-soft)" : "var(--dim)",
          border: `1px solid ${got ? "var(--mag-edge)" : "var(--edge)"}`,
          outline: ring ? `2px solid ${ring}` : undefined,
          outlineOffset: 1,
          borderRadius: 6,
        }}
      >
        {BADGE_GLYPH}
      </div>
    );
  }
  // JOINED IN is drawn on 20 cells, the rest on 21.
  const cells = b.slug === "joined-in" ? 20 : 21;
  return (
    <span
      style={{
        position: "relative",
        width: 42,
        height: 42,
        flex: "none",
        display: "block",
        outline: ring ? `2px solid ${ring}` : undefined,
        outlineOffset: 1,
      }}
    >
      {/* The art brings its own frame, so it is shown as it is, a whole number of times
          larger so the pixels stay sharp. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/${b.art}`}
        alt=""
        width={42}
        height={42}
        style={{ display: "block", imageRendering: "pixelated", filter: got ? "none" : "grayscale(1)" }}
      />
      {progress !== undefined && b.slug === "a-helping-hand" ? <HeartProgress done={progress} /> : null}
      {tiered ? <TierPips tier={tier} cells={cells} /> : null}
    </span>
  );
}

/** A token's picture at `size` (a whole multiple of 32 keeps the pixels square). */
export function TokenImage({ design, size = 64, alt = "" }: { design: unknown; size?: number; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tokenSrc(normalizeToken(design))}
      alt={alt}
      width={size}
      height={size}
      style={{ display: "block", flex: "none", imageRendering: "pixelated" }}
    />
  );
}

/** The picture of a tradable badge or a token, as it sits in a list. */
export function ItemArt({ item, size }: { item: Pick<BadgeItem, "kind" | "design" | "kindRow">; size?: number }) {
  if (item.kind === "token") return <TokenImage design={item.design} size={size ?? 64} />;
  if (!item.kindRow?.art) {
    return (
      <div aria-hidden style={{ width: 42, height: 42, flex: "none", display: "grid", placeItems: "center", color: "var(--mag-soft)" }}>
        {BADGE_GLYPH}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/badges/tradable/${item.kindRow.art}`}
      alt=""
      width={size ?? 42}
      height={size ?? 42}
      style={{ display: "block", flex: "none", imageRendering: "pixelated" }}
    />
  );
}

/** A tradable badge or a token in the badges grid: picture, name, what it is worth. */
export function ItemTile({ item, note }: { item: BadgeItem | TradeItem; note?: string }) {
  const worth = item.kind === "token" ? BADGE_MANA.token : BADGE_MANA.tradable;
  const maker = "maker" in item ? item.maker?.handle : undefined;
  const birthday = "occasion" in item && item.occasion === "birthday" ? "A birthday badge. " : "";
  return (
    <div className="tile" style={{ padding: 10, display: "flex", gap: 9, alignItems: "flex-start" }}>
      <ItemArt item={item} />
      <div style={{ minWidth: 0 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
          {itemTitle(item).toUpperCase()}
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>
          {note ?? (item.kind === "token" ? `${maker ? `From ${maker}. ` : ""}Worth ${worth} max mana.` : `${birthday}${item.kindRow?.blurb ?? ""} Worth ${worth} max mana.`)}
        </div>
      </div>
    </div>
  );
}
