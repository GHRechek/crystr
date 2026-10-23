/** Chunky pixel icons for the post actions. They take the surrounding text colour. */
const HEART = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];
const REPLY = ["01111110", "11111111", "11000011", "11000011", "11111111", "01111111", "00011000", "00010000"];

function Pixels({ rows, size, fill }: { rows: string[]; size: number; fill?: boolean }) {
  const h = rows.length;
  return (
    <svg aria-hidden width={size} height={(size * h) / 8} viewBox={`0 0 8 ${h}`} shapeRendering="crispEdges" style={{ display: "block", flex: "none" }}>
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "1" ? (
            // the speech bubble is an outline: its inner cells are blank
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" opacity={!fill && y > 1 && y < 4 && x > 1 && x < 6 ? 0 : 1} />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function HeartIcon({ size = 26, filled }: { size?: number; filled?: boolean }) {
  return <Pixels rows={HEART} size={size} fill={filled} />;
}

export function ReplyIcon({ size = 26 }: { size?: number }) {
  return <Pixels rows={REPLY} size={size} />;
}
