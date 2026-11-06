/** Small pixel pictures for the profile details, drawn from a grid of # and . at three screen
 *  pixels to a cell, so the edges stay square. The label is for screen readers and hover. */
const THUMB_UP = [
  "....##....",
  "...###....",
  "...##.....",
  "...##.....",
  ".#######..",
  ".########.",
  ".########.",
  ".########.",
  ".#######..",
  "..######..",
];

const GLYPHS = {
  likes: { rows: THUMB_UP, color: "var(--blu-soft)" },
  dislikes: { rows: [...THUMB_UP].reverse(), color: "var(--mag-soft)" },
} as const;

/** The rest come from the uploaded badge set (public/badges/set/<n>.png). */
const FROM_SET = { food: 135, obsession: 103, birthday: 110 } as const;

export type GlyphKind = keyof typeof GLYPHS | keyof typeof FROM_SET;

export function PixelGlyph({ kind, label }: { kind: GlyphKind; label: string }) {
  if (kind in FROM_SET) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/badges/set/${FROM_SET[kind as keyof typeof FROM_SET]}.png`} alt={label} title={label} width={20} height={20} style={{ display: "block", imageRendering: "pixelated" }} />;
  }
  const { rows, color } = GLYPHS[kind as keyof typeof GLYPHS];
  const w = rows[0].length;
  const U = 2;
  return (
    <svg role="img" aria-label={label} width={w * U} height={rows.length * U} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" style={{ display: "block", color }}>
      <title>{label}</title>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}
