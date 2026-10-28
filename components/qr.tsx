import { create } from "qrcode";

/** A QR code drawn as pixels: dark modules on white with the four-module quiet zone the
 *  readers expect, crisp at any size. Rendered on the server; the text never changes
 *  without the page changing. */
export function QrCode({ text, size = 232, label }: { text: string; size?: number; label: string }) {
  const qr = create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 4;
  const total = n + quiet * 2;
  // Each row's dark runs become one rect, so a 33-cell code is a few hundred nodes, not a
  // thousand.
  const runs: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c += 1;
        continue;
      }
      let w = 1;
      while (c + w < n && qr.modules.get(r, c + w)) w += 1;
      runs.push(<rect key={`${r}-${c}`} x={quiet + c} y={quiet + r} width={w} height={1} />);
      c += w;
    }
  }
  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      style={{ display: "block" }}
    >
      <rect x={0} y={0} width={total} height={total} fill="#fff" />
      <g fill="#0b0b10">{runs}</g>
    </svg>
  );
}
