"use client";

import { QrScanner } from "@/components/qr-scanner";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TokenImage } from "@/components/badges";
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
  scan,
  compact,
  openAtStart,
  token,
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
  /** The trade icon opens the camera to scan someone's code instead of going to the trade menu. */
  scan?: boolean;
  /** The slim version that sits beside the portrait: a small trade icon and a cog at the end. */
  compact?: boolean;
  /** Open the full list of badges, to choose which to show, as soon as it appears. */
  openAtStart?: boolean;
  /** The person's token, always the first badge in the row. `design` is null when they have none yet. */
  token?: { design: unknown | null; href?: string; title?: string; line?: string; actionLabel?: string };
  editable?: boolean;
}) {
  const [tip, setTip] = useState<{ key: string; x: number; top: number } | null>(null);
  const [choosing, setChoosing] = useState(!!openAtStart && !!editable);
  const [scanning, setScanning] = useState(false);
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

  // The slim row fills the space beside the portrait, out to where the thought bubble ends: five badges
  // and the trade (or eye) button share the width.
  const gap = 4;
  const px = compact ? Math.max(28, Math.min(48, Math.floor((width - gap * 5) / 6))) : 42;
  // Beside the portrait the token leads, a size up, and the badges after it step down to fit; the
  // trade button keeps the plain size. All of them sit on one centre line.
  const tokPx = compact ? Math.round(px * 1.35) : px;
  const badgePx = compact ? Math.max(22, Math.min(Math.round(px * 0.82), Math.floor((width - gap * 5 - px - tokPx) / 4))) : px;
  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;

  return (
    <div ref={box} style={{ position: "relative", display: "flex", flexWrap: compact ? "nowrap" : "wrap", alignItems: "center", gap: compact ? gap : 6 }}>
      {token ? (
        <button
          type="button"
          data-about-badge
          aria-label={token.title ? `${token.title}. ${token.line ?? ""}` : "Token"}
          aria-expanded={tip?.key === "__token"}
          onClick={(e) => {
            const r = e.currentTarget;
            setTip((t) => (t?.key === "__token" ? null : { key: "__token", x: r.offsetLeft + r.offsetWidth / 2, top: r.offsetTop + r.offsetHeight + 6 }));
          }}
          style={{ flex: "none", width: tokPx, height: tokPx, display: "grid", placeItems: "center", padding: 0, background: "none", cursor: "pointer", lineHeight: 0, color: "var(--dim)", border: token.design ? 0 : "1px dashed var(--edge)", borderRadius: "var(--px-r)" }}
        >
          {token.design ? <TokenImage design={token.design} size={tokPx} /> : <span className="px" style={{ fontSize: 12 }}>?</span>}
        </button>
      ) : null}
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
          <BadgeFace b={b} size={badgePx} />
        </button>
      ))}
      {!noPen && !compact && (earned.length || tradable.length || editable) ? (
        <button
          type="button"
          aria-label={editable ? "See all your badges and choose which to show" : "See all their badges"}
          onClick={() => setChoosing(true)}
          style={{ flex: "none", width: 42, height: 42, display: "grid", placeItems: "center", background: "none", border: 0, borderRadius: "var(--px-r)", color: "var(--muted)", cursor: "pointer", fontSize: 15 }}
        >
          {editable ? "✎" : <EyeIcon />}
        </button>
      ) : null}
      {tradeHref && scan ? (
        <>
          <button type="button" aria-label="Scan someone's code to trade" title="Scan a code" onClick={() => setScanning(true)} style={{ position: "relative", flex: "none", width: px, height: px, display: "grid", placeItems: "center", background: "none", border: 0, borderRadius: "var(--px-r)", color: "var(--muted)", cursor: "pointer" }}>
            <TradeIcon />
            {tradeCount ? (
              <span aria-hidden className="px" style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>{tradeCount}</span>
            ) : null}
          </button>
          {scanning ? <QrScanner onClose={() => setScanning(false)} tradesHref={tradeHref} waiting={tradeCount} /> : null}
        </>
      ) : tradeHref ? (
        <Link
          href={tradeHref}
          aria-label={tradeCount ? `Trades, ${tradeCount} waiting` : "Trades"}
          title="Trades"
          style={{ position: "relative", flex: "none", width: px, height: px, display: "grid", placeItems: "center", border: 0, borderRadius: "var(--px-r)", color: "var(--muted)", textDecoration: "none" }}
        >
          <TradeIcon />
          {tradeCount ? (
            <span aria-hidden className="px" style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>
              {tradeCount}
            </span>
          ) : null}
        </Link>
      ) : null}
      {compact && !editable && (earned.length || tradable.length) ? (
        <button
          type="button"
          aria-label="See all their badges"
          onClick={() => setChoosing(true)}
          style={{ flex: "none", width: px, height: px, display: "grid", placeItems: "center", background: "none", border: 0, borderRadius: "var(--px-r)", color: "var(--muted)", cursor: "pointer" }}
        >
          <EyeIcon />
        </button>
      ) : null}
      {tip?.key === "__token" && token ? (
        <BadgeTip
          x={tip.x}
          top={tip.top}
          width={width}
          title={token.title ?? "TOKEN"}
          line={token.line ?? ""}
          action={
            token.href ? (
              <Link href={token.href} className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
                {token.actionLabel ?? "OPEN →"}
              </Link>
            ) : null
          }
        />
      ) : tipBadge && tip ? (
        <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.line} />
      ) : null}
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
