"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { BadgeTip } from "@/components/badge-tip";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";

const GAP = 10;

/** The badges a person shows: a row, centred, with no cards. It lives on the banner at the top of
 *  their profile. Tap one for a tooltip with its name and what its owner did to earn it. They are
 *  chosen from the menu on your own portrait. */
export function ShownBadges({ shown }: { shown: ShownBadge[] }) {
  const [tip, setTip] = useState<{ key: string; x: number; top: number } | null>(null);
  const row = useRef<HTMLDivElement>(null);
  // Whole multiples of the art's 21 cells keep its pixels square: three times where four fit
  // across the page, twice or once on a narrower one.
  const [px, setPx] = useState(63);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const fit = () => {
      const cell = (el.clientWidth - (SHOW_MAX - 1) * GAP) / SHOW_MAX;
      setPx(cell >= 65 ? 63 : cell >= 44 ? 42 : 21);
      setWidth(el.clientWidth);
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
      if (!(e.target as HTMLElement).closest?.("[data-shown-badge], [data-badge-tip]")) setTip(null);
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
            setTip((t) => (t?.key === b.key ? null : { key: b.key, x: r.offsetLeft + r.offsetWidth / 2, top: r.offsetTop + r.offsetHeight + 8 }));
          }}
          style={{ flex: "none", width: px + 2, minHeight: px + 2, padding: 1, background: "none", border: 0, cursor: "pointer", display: "grid", placeItems: "center", filter: "drop-shadow(0 2px 0 rgba(0,0,0,.35))" }}
        >
          <BadgeFace b={b} size={px} />
        </button>
      ))}
      {tipBadge && tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.line} /> : null}
    </div>
  );
}
