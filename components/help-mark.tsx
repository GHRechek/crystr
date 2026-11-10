/** The mark on a call for help: a pixel question mark in the CRYSTR colours, pink down to blue. */
export function HelpMark({ size = 14, fill }: { size?: number; /** A plain colour instead of the gradient, for when it sits on the gradient. */ fill?: string }) {
  // A question mark, five wide and nine tall.
  const rows = [".###.", "#...#", "#...#", "....#", "...#.", "..#..", "..#..", ".....", "..#.."];
  return (
    <svg width={size * 5 / 9} height={size} viewBox="0 0 5 9" shapeRendering="crispEdges" aria-hidden style={{ flex: "none", display: "block", margin: "2px 4px 2px 2px", filter: "drop-shadow(1px 1px 0 #0a0616)" }}>
      <defs>
        <linearGradient id="helpmark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0398a" />
          <stop offset="0.55" stopColor="#9184d9" />
          <stop offset="1" stopColor="#4c7df0" />
        </linearGradient>
      </defs>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill ?? "url(#helpmark)"} /> : null)))}
    </svg>
  );
}
