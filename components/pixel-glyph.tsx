/** Small pixel pictures for the profile details, drawn from a grid of # and . at three screen
 *  pixels to a cell, so the edges stay square. The label is for screen readers and hover. */
// O outline, F fill, H highlight, S shade.
const THUMB_UP = [
  ".....OO......",
  "....OFFO.....",
  "....OFHO.....",
  "....OFFO.....",
  "....OFFOOOO..",
  ".OOOOFFFFFFO.",
  "OFFFFFFFFFFFO",
  "OFHFFFFFFFFFO",
  "OFFFFFFFFFFFO",
  "OSSSSSSSSSSFO",
  "OFFFFFFFFFFFO",
  "OSSSSSSSSSSFO",
  ".OFFFFFFFFFO.",
  "..OOOOOOOOO..",
];

const GLYPHS = {
  likes: { rows: THUMB_UP, fill: "#78aaff", shade: "#466ebe", light: "#dcebff" },
  dislikes: { rows: [...THUMB_UP].reverse(), fill: "#ff7896", shade: "#be4664", light: "#ffdce6" },
} as const;

/** The rest come from the uploaded badge set (public/badges/set/<n>.png). */
const FROM_SET = { food: 135, obsession: 103, birthday: 110 } as const;

export type GlyphKind = keyof typeof GLYPHS | keyof typeof FROM_SET;

export function PixelGlyph({ kind, label }: { kind: GlyphKind; label: string }) {
  if (kind in FROM_SET) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/badges/set/${FROM_SET[kind as keyof typeof FROM_SET]}.png`} alt={label} title={label} width={20} height={20} style={{ display: "block", imageRendering: "pixelated" }} />;
  }
  const { rows, fill, shade, light } = GLYPHS[kind as keyof typeof GLYPHS];
  const paint: Record<string, string> = { O: "#0d0b14", F: fill, S: shade, H: light };
  const w = rows[0].length;
  const U = 1.5;
  return (
    <svg role="img" aria-label={label} width={w * U} height={rows.length * U} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <title>{label}</title>
      {rows.flatMap((r, y) => [...r].map((c, x) => (paint[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={paint[c]} /> : null)))}
    </svg>
  );
}
