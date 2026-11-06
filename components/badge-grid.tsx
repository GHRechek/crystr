"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { BadgeTip } from "@/components/badge-tip";
import { ArrowIcon } from "@/components/icons";
import type { ShownBadge } from "@/lib/badges";

const CELL = 42; // the art at twice its size, so its pixels stay square
const GAP = 2;
const ROWS = 3;

/** A collection of badges, and nothing else: just the pictures, packed tight, three rows across
 *  the page, with no names or cards. Tap one for its name and how it is earned. The heading, how
 *  many there are, and (when there is more than a page) the page count and the arrows all sit on
 *  one line, the page controls pushed to the right. Built to stay usable at hundreds.
 *  `aside` is anything else that belongs on that line, before the page controls. */
export function BadgeGrid({
  title,
  tone = "var(--mag-soft)",
  count,
  items,
  aside,
}: {
  title: string;
  tone?: string;
  /** What to say after the title: "4 OF 8", "3". */
  count: string;
  items: ShownBadge[];
  aside?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(8);
  const [width, setWidth] = useState(320);
  const [page, setPage] = useState(0);
  const [tip, setTip] = useState<{ key: string; x: number; top: number } | null>(null);

  // As many across as fit; three rows of them to a page.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      setWidth(el.clientWidth);
      setCols(Math.max(3, Math.floor((el.clientWidth + GAP) / (CELL + GAP))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!tip) return;
    const away = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-grid-badge], [data-badge-tip]")) setTip(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  const perPage = cols * ROWS;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const at = Math.min(page, pages - 1);
  const shown = items.slice(at * perPage, (at + 1) * perPage);
  const go = (n: number) => {
    setTip(null);
    setPage(Math.max(0, Math.min(pages - 1, n)));
  };
  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32 }}>
        <div className="px" style={{ fontSize: 12, color: tone, whiteSpace: "nowrap" }}>
          {title} <span style={{ fontSize: 11, color: "var(--muted)" }}>· {count}</span>
        </div>
        <span className="spacer" />
        {aside}
        {pages > 1 ? (
          <>
            <span className="px" style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
              {at + 1} / {pages}
            </span>
            <button type="button" className="btn btn-sm" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous page" style={{ minHeight: 32, minWidth: 34, padding: 0 }}>
              <ArrowIcon dir="left" />
            </button>
            <button type="button" className="btn btn-sm" onClick={() => go(at + 1)} disabled={at === pages - 1} aria-label="Next page" style={{ minHeight: 32, minWidth: 34, padding: 0 }}>
              <ArrowIcon dir="right" />
            </button>
          </>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ padding: "10px 0" }}>
          NONE YET
        </div>
      ) : (
        <div ref={box} style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, gap: GAP, justifyContent: "start" }}>
          {shown.map((b) => (
            <button
              key={b.key}
              type="button"
              data-grid-badge
              aria-label={`${b.title}. ${b.locked ? "Not yet. " : ""}${b.line}`}
              aria-expanded={tip?.key === b.key}
              onClick={(e) => {
                const r = e.currentTarget;
                setTip((t) => (t?.key === b.key ? null : { key: b.key, x: r.offsetLeft + r.offsetWidth / 2, top: r.offsetTop + r.offsetHeight + 6 }));
              }}
              style={{ width: CELL, height: CELL, padding: 0, background: "none", border: 0, cursor: "pointer", display: "grid", placeItems: "center", opacity: b.locked ? 0.4 : 1 }}
            >
              <BadgeFace b={b} size={CELL} />
            </button>
          ))}
          {tipBadge && tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.locked ? `Not yet. ${tipBadge.line}` : tipBadge.line} /> : null}
        </div>
      )}
      {/* The box is measured when there is something in it; keep a hidden one so the first
          measure happens before the first badge is drawn. */}
      {items.length === 0 ? <div ref={box} aria-hidden style={{ height: 0 }} /> : null}
    </div>
  );
}
