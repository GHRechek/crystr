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

/** The art of an achievement badge at twice its size, greyed until earned. With `progress`
 *  (the helping-hand badge only), the count to the next tradable badge sits in the heart. */
export function BadgeArt({ b, got, progress }: { b: Pick<BadgeRow, "art" | "slug">; got: boolean; progress?: number }) {
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
          borderRadius: 6,
        }}
      >
        {BADGE_GLYPH}
      </div>
    );
  }
  return (
    <span style={{ position: "relative", width: 42, height: 42, flex: "none", display: "block" }}>
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
  return (
    <div className="tile" style={{ padding: 10, display: "flex", gap: 9, alignItems: "flex-start" }}>
      <ItemArt item={item} />
      <div style={{ minWidth: 0 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
          {itemTitle(item).toUpperCase()}
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>
          {note ?? (item.kind === "token" ? `${maker ? `From ${maker}. ` : ""}Worth ${worth} max mana.` : `${item.kindRow?.blurb ?? ""} Worth ${worth} max mana.`)}
        </div>
      </div>
    </div>
  );
}
