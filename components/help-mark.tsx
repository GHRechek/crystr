import { useId } from "react";

/** The mark on a call for help: a thick pixel exclamation in the CRYSTR colours, pink down to blue. */
export function HelpMark({ size = 14, fill, edge }: { size?: number; /** A plain colour instead of the gradient. */ fill?: string; /** A dark edge round it, for when it sits on something busy. */ edge?: boolean }) {
  const rows = ["###", "###", "###", "###", "###", ".#.", "...", "###", "###"];
  const id = `hm${useId().replace(/:/g, "")}`;
  return (
    <svg width={size / 3} height={size} viewBox="0 0 3 9" shapeRendering="crispEdges" aria-hidden style={{ flex: "none", display: "block", margin: "0 2px", filter: edge ? "drop-shadow(1px 0 0 #0a0616) drop-shadow(-1px 0 0 #0a0616) drop-shadow(0 1px 0 #0a0616) drop-shadow(0 -1px 0 #0a0616)" : undefined }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0398a" />
          <stop offset="0.55" stopColor="#9184d9" />
          <stop offset="1" stopColor="#4c7df0" />
        </linearGradient>
      </defs>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill ?? `url(#${id})`} /> : null)))}
    </svg>
  );
}
