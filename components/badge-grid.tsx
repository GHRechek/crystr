"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { BadgeTip } from "@/components/badge-tip";
import { ArrowIcon } from "@/components/icons";
import type { ShownBadge } from "@/lib/badges";

const PER_PAGE = 30; // six across, five down
const GAP = 6;

/** A collection of badges drawn small, six across, with no words and no cards: built to stay
 *  usable at hundreds. Tap one for its name and how it is earned. Thirty to a page, with arrows.
 *  With `filter` (your own) you can look at just the ones you have, or at every badge there is,
 *  the ones you do not have yet dimmed. */
export function BadgeGrid({ items, filter, label }: { items: ShownBadge[]; filter?: boolean; label: string }) {
  const have = items.filter((b) => !b.locked);
  const [which, setWhich] = useState<"have" | "all">(have.length || !filter ? "have" : "all");
  const [page, setPage] = useState(0);
  const [tip, setTip] = useState<{ key: string; x: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  const list = filter && which === "all" ? items : have;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages - 1);
  const shown = list.slice(at * PER_PAGE, (at + 1) * PER_PAGE);

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

  const go = (n: number) => {
    setTip(null);
    setPage(Math.max(0, Math.min(pages - 1, n)));
  };
  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {filter && items.length > have.length ? (
        <div className="seg" role="tablist" aria-label={`${label}: which to show`}>
          {([["have", `HAVE · ${have.length}`], ["all", `ALL · ${items.length}`]] as const).map(([k, text]) => (
            <button key={k} type="button" role="tab" aria-selected={which === k} data-on={which === k} onClick={() => { setWhich(k); setPage(0); setTip(null); }} style={{ minHeight: 40 }}>
              {text}
            </button>
          ))}
        </div>
      ) : null}

      {list.length === 0 ? <div className="empty">NONE YET</div> : null}

      <div ref={box} style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(6, minmax(0, 1fr))`, gap: GAP }}>
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
            style={{ minHeight: 48, padding: 2, background: "none", border: 0, cursor: "pointer", display: "grid", placeItems: "center", opacity: b.locked ? 0.4 : 1 }}
          >
            <BadgeFace b={b} size={42} />
          </button>
        ))}
        {tipBadge && tip ? (
          <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.locked ? `Not yet. ${tipBadge.line}` : tipBadge.line} />
        ) : null}
      </div>

      {pages > 1 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <button type="button" className="btn btn-sm pager-btn" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous page">
            <ArrowIcon dir="left" />
          </button>
          <span className="px" style={{ fontSize: 11, color: "var(--muted)", minWidth: 56, textAlign: "center" }}>
            {at + 1} / {pages}
          </span>
          <button type="button" className="btn btn-sm pager-btn" onClick={() => go(at + 1)} disabled={at === pages - 1} aria-label="Next page">
            <ArrowIcon dir="right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
