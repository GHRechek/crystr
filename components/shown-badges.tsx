"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import type { ShownBadge } from "@/lib/badges";

const SHOW = 5;
const GAP = 6;

/** The badges a person shows, in a row above their About card, on the profile's own background
 *  (no cards, no heading). Tap one for a tooltip with its name and what its owner did to earn it.
 *  They are chosen from the menu on your own portrait. */
export function ShownBadges({ shown }: { shown: ShownBadge[] }) {
  const [tip, setTip] = useState<{ key: string; x: number } | null>(null);
  const row = useRef<HTMLDivElement>(null);
  // Whole multiples of the art's 21 cells keep its pixels square: three times where five fit across
  // the page, twice or once on a narrower one.
  const [px, setPx] = useState(63);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const fit = () => {
      const cell = (el.clientWidth - (SHOW - 1) * GAP) / SHOW;
      setPx(cell >= 65 ? 63 : cell >= 44 ? 42 : 21);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown.length]);

  // A tooltip goes away on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!tip) return;
    const away = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-shown-badge], [data-shown-tip]")) setTip(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  if (shown.length === 0) return null;
  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;

  return (
    <div ref={row} style={{ position: "relative", display: "flex", justifyContent: "center", gap: GAP }}>
      {shown.map((b) => (
        <button
          key={b.key}
          type="button"
          data-shown-badge
          aria-label={`${b.title}. ${b.line}`}
          aria-expanded={tip?.key === b.key}
          onClick={(e) => {
            const r = e.currentTarget;
            setTip((t) => (t?.key === b.key ? null : { key: b.key, x: r.offsetLeft + r.offsetWidth / 2 }));
          }}
          style={{ flex: "none", width: px + 2, minHeight: px + 2, padding: 1, background: "none", border: 0, cursor: "pointer", display: "grid", placeItems: "center" }}
        >
          <BadgeFace b={b} size={px} />
        </button>
      ))}

      {tipBadge && tip ? (
        <div
          data-shown-tip
          role="tooltip"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 8px)",
            zIndex: 20,
            padding: "9px 11px",
            background: "var(--raised)",
            boxShadow: "0 0 0 1px var(--edge), 0 8px 24px rgba(0,0,0,.45)",
            borderRadius: "var(--px-r)",
          }}
        >
          <span aria-hidden style={{ position: "absolute", top: -5, left: Math.max(10, Math.min(tip.x - 5, (row.current?.clientWidth ?? 320) - 20)), width: 10, height: 10, background: "var(--raised)", boxShadow: "-1px -1px 0 var(--edge)", transform: "rotate(45deg)" }} />
          <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
            {tipBadge.title}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>{tipBadge.line}</div>
        </div>
      ) : null}
    </div>
  );
}
