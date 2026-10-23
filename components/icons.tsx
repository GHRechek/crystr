/** Fine pixel icons for the post actions: a one-pixel outline on an 11-pixel grid, drawn
 *  two screen pixels to the cell. They take the surrounding text colour. */
const HEART = ["01110011100", "11111111111", "11111111111", "11111111111", "01111111110", "00111111100", "00011111000", "00001110000", "00000100000"];
const REPLY = ["01111111110", "11111111111", "11111111111", "11111111111", "11111111111", "11111111111", "01111111110", "00111000000", "00011000000"];

function Pixels({ rows, solid, small }: { rows: string[]; solid?: boolean; small?: boolean }) {
  const on = (x: number, y: number) => rows[y]?.[x] === "1";
  const w = small ? 17 : 22;
  const cells: React.ReactNode[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== "1") return;
      const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
      if (solid || edge) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }),
  );
  return (
    <svg aria-hidden width={w} height={rows.length * (w / 11)} viewBox={`0 0 11 ${rows.length}`} shapeRendering="crispEdges" fill="currentColor" style={{ display: "block", flex: "none" }}>
      {cells}
    </svg>
  );
}

export function HeartIcon({ filled, small }: { filled?: boolean; small?: boolean }) {
  return <Pixels rows={HEART} solid={filled} small={small} />;
}

export function ReplyIcon({ small }: { small?: boolean }) {
  return <Pixels rows={REPLY} small={small} />;
}
