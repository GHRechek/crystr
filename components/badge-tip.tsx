/** The bubble that says what a badge is and how it is earned: below the thing tapped, as wide
 *  as the box it hangs in, with a small point at the badge. `x` is the badge's middle across the
 *  box and `top` where the bubble starts down it. */
export function BadgeTip({ x, top, width, title, line }: { x: number; top: number; width: number; title: string; line: string }) {
  return (
    <div
      data-badge-tip
      role="tooltip"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        zIndex: 30,
        padding: "9px 11px",
        background: "var(--raised)",
        boxShadow: "0 0 0 1px var(--edge), 0 8px 24px rgba(0,0,0,.45)",
        borderRadius: "var(--px-r)",
      }}
    >
      <span aria-hidden style={{ position: "absolute", top: -5, left: Math.max(10, Math.min(x - 5, width - 20)), width: 10, height: 10, background: "var(--raised)", boxShadow: "-1px -1px 0 var(--edge)", transform: "rotate(45deg)" }} />
      <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>{line}</div>
    </div>
  );
}
