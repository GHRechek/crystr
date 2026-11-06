"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeChooser, BadgeFace } from "@/components/badge-chooser";
import { BadgeTip } from "@/components/badge-tip";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";

/** The strip under the About Me text: the person's token (passed in as children), then up to five
 *  badges of their choosing, smaller. Tap a badge for its name and what it took. On your own page
 *  a small + (or the last empty slot) opens the choice of which to show. */
export function AboutBadges({
  children,
  shown,
  options,
  editable,
}: {
  children?: React.ReactNode;
  shown: ShownBadge[];
  options?: ShownBadge[];
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
    <div ref={box} style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
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
      {editable ? (
        <button
          type="button"
          aria-label="Choose the badges you show"
          onClick={() => setChoosing(true)}
          className="px"
          style={{ flex: "none", width: 42, height: 42, display: "grid", placeItems: "center", background: "none", border: "1px dashed var(--edge)", borderRadius: "var(--px-r)", color: "var(--dim)", fontSize: 14, cursor: "pointer" }}
        >
          {shown.length ? "✎" : "+"}
        </button>
      ) : null}
      {tipBadge && tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.line} /> : null}
      {choosing && editable ? <BadgeChooser options={options ?? []} current={shown.map((b) => b.key)} onClose={() => setChoosing(false)} /> : null}
    </div>
  );
}
