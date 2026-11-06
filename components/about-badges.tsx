"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeFace } from "@/components/badge-chooser";
import { BadgeViewer } from "@/components/badge-viewer";
import { BadgeTip } from "@/components/badge-tip";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";

/** The strip under the About Me text: the person's token (passed in as children), then up to five
 *  badges of their choosing, smaller. Tap a badge for its name and what it took. On your own page
 *  a small + (or the last empty slot) opens the choice of which to show. */
export function AboutBadges({
  children,
  shown,
  earned,
  tradable,
  aside,
  editable,
  noPen,
  tradeHref,
  tradeCount,
}: {
  children?: React.ReactNode;
  shown: ShownBadge[];
  /** Everything they have, for the full-screen look: earned, and tradable. */
  earned: ShownBadge[];
  tradable: ShownBadge[];
  aside?: React.ReactNode;
  /** No pen or eye: the page puts its own way to the full list beside this row. */
  noPen?: boolean;
  /** A trade icon at the end of the row, to the trade menu, with how many are waiting. */
  tradeHref?: string;
  tradeCount?: number;
  editable?: boolean;
}) {
  const [tip, setTip] = useState<{ key: string; x: number; top: number } | null>(null);
  const [choosing, setChoosing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setWidth(el.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!tip) return;
    const away = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-about-badge], [data-badge-tip]")) setTip(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;

  return (
    <div ref={box} style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      {children}
      {shown.slice(0, SHOW_MAX).map((b) => (
        <button
          key={b.key}
          type="button"
          data-about-badge
          aria-label={`${b.title}. ${b.line}`}
          aria-expanded={tip?.key === b.key}
          onClick={(e) => {
            const r = e.currentTarget;
            setTip((t) => (t?.key === b.key ? null : { key: b.key, x: r.offsetLeft + r.offsetWidth / 2, top: r.offsetTop + r.offsetHeight + 6 }));
          }}
          style={{ flex: "none", padding: 0, background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}
        >
          <BadgeFace b={b} size={42} />
        </button>
      ))}
      {!noPen && (earned.length || tradable.length || editable) ? (
        <button
          type="button"
          aria-label={editable ? "See all your badges and choose which to show" : "See all their badges"}
          onClick={() => setChoosing(true)}
          style={{ flex: "none", width: 42, height: 42, display: "grid", placeItems: "center", background: "none", border: "1px dashed var(--edge)", borderRadius: "var(--px-r)", color: "var(--muted)", cursor: "pointer", fontSize: 15 }}
        >
          {editable ? "✎" : <EyeIcon />}
        </button>
      ) : null}
      {tradeHref ? (
        <Link
          href={tradeHref}
          aria-label={tradeCount ? `Trades, ${tradeCount} waiting` : "Trades"}
          title="Trades"
          style={{ position: "relative", flex: "none", width: 42, height: 42, display: "grid", placeItems: "center", border: "1px dashed var(--edge)", borderRadius: "var(--px-r)", color: "var(--muted)", textDecoration: "none" }}
        >
          <TradeIcon />
          {tradeCount ? (
            <span aria-hidden className="px" style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 8 }}>
              {tradeCount}
            </span>
          ) : null}
        </Link>
      ) : null}
      {tipBadge && tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.line} /> : null}
      {choosing ? <BadgeViewer earned={earned} tradable={tradable} current={shown.map((b) => b.key)} editable={editable} aside={aside} onClose={() => setChoosing(false)} /> : null}
    </div>
  );
}

/** A pixel eye, for looking at someone else's badges. */
function EyeIcon() {
  const rows = ["..#####..", ".#.....#.", "#..###..#", "#.#####.#", "#..###..#", ".#.....#.", "..#####.."];
  return (
    <svg width={18} height={14} viewBox="0 0 9 7" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}

/** Two pixel arrows passing each other: a trade. */
function TradeIcon() {
  const rows = ["......#..", ".......#.", "#########", ".......#.", "......#..", ".........", "..#......", ".#.......", "#########", ".#.......", "..#......"];
  const on = (r: number, c: number) => rows[r][c] === "#";
  return (
    <svg width={20} height={22} viewBox="0 0 9 11" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((r, y) => [...r].map((_, x) => (on(y, x) ? <rect key={`${x}${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}
