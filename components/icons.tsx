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

/** A short pixel arrow (five cells each way, two screen pixels to the cell), for links that
 *  go somewhere. `dir` turns it. It takes the surrounding text colour and sits on the line. */
const ARROW = ["00100", "00010", "11111", "00010", "00100"];
export function ArrowIcon({ dir = "right" }: { dir?: "right" | "up" | "down" | "left" }) {
  const turn = { right: 0, down: 90, left: 180, up: 270 }[dir];
  const cells: React.ReactNode[] = [];
  ARROW.forEach((row, y) => [...row].forEach((c, x) => c === "1" && cells.push(<rect key={`${x}${y}`} x={x} y={y} width={1} height={1} />)));
  return (
    <svg
      aria-hidden
      viewBox="0 0 5 5"
      width={10}
      height={10}
      shapeRendering="crispEdges"
      fill="currentColor"
      style={{ display: "inline-block", verticalAlign: "middle", flex: "none", transform: turn ? `rotate(${turn}deg)` : undefined }}
    >
      {cells}
    </svg>
  );
}

/** Three pixel dots in a row, for "more": each dot is one cell of a five-by-one grid, three
 *  screen pixels to the cell. It takes the surrounding text colour. */
export function MoreIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 5 1"
      width={20}
      height={4}
      shapeRendering="crispEdges"
      fill="currentColor"
      style={{ display: "block" }}
    >
      <rect x={0} y={0} width={1} height={1} />
      <rect x={2} y={0} width={1} height={1} />
      <rect x={4} y={0} width={1} height={1} />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" shapeRendering="crispEdges" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.3" />
      <path d="M10 10l4 4" strokeLinecap="square" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-1px" }}>
      <path d="M1.5 5h3l1.2-2h4.6l1.2 2h3v8h-13z" />
      <circle cx="8" cy="8.8" r="2.3" />
    </svg>
  );
}
