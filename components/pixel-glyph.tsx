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
const FOOD = [
  "...#...",
  "..###..",
  "#######",
  ".#####.",
  ".##.##.",
  ".#...#.",
  ".......",
  "#######",
  "#######",
  ".#####.",
];
const HEART = [
  "..###.###..",
  ".#########.",
  ".#########.",
  ".#########.",
  "..#######..",
  "...#####...",
  "....###....",
  ".....#.....",
];
const CAKE = [
  "....#....",
  "....#....",
  ".#######.",
  ".#######.",
  "#########",
  "#########",
  "#########",
  "#########",
];

function hearts(): string[] {
  // A big heart with a small one rising from its shoulder.
  const small = [".#.#.", "#####", ".###.", "..#.."];
  const w = 15;
  const rows = Array.from({ length: 11 }, () => Array<string>(w).fill("."));
  HEART.forEach((r, y) => [...r].forEach((c, x) => c === "#" && (rows[y + 3][x] = "#")));
  small.forEach((r, y) => [...r].forEach((c, x) => c === "#" && (rows[y][x + 10] = "#")));
  return rows.map((r) => r.join(""));
}

const GLYPHS = {
  likes: { rows: THUMB_UP, color: "var(--blu-soft)" },
  dislikes: { rows: [...THUMB_UP].reverse(), color: "var(--mag-soft)" },
  food: { rows: FOOD, color: "#e8c14b" },
  obsession: { rows: hearts(), color: "var(--mag)" },
  birthday: { rows: CAKE, color: "var(--pur-soft)" },
} as const;

export type GlyphKind = keyof typeof GLYPHS;

export function PixelGlyph({ kind, label }: { kind: GlyphKind; label: string }) {
  const { rows, color } = GLYPHS[kind];
  const w = rows[0].length;
  const U = 3;
  return (
    <svg role="img" aria-label={label} width={w * U} height={rows.length * U} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" style={{ display: "block", color }}>
      <title>{label}</title>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}
