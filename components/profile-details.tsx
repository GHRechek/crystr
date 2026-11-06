"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeTip } from "@/components/badge-tip";

/** What each detail is: a small picture, and what a tap on it says. */
const KINDS = {
  birthday: { art: 130, title: "BIRTHDAY", line: "Their birthday." },
  likes: { art: 103, title: "LIKES", line: "What they like." },
  food: { art: 135, title: "FAVOURITE FOOD", line: "Their favourite food." },
  obsession: { art: 139, title: "OBSESSED WITH", line: "What they are obsessed with right now." },
} as const;

export type DetailKind = keyof typeof KINDS;

/** The details on a profile: a small picture and the words, no label. Tap a row to say what it is. */
export function ProfileDetails({ rows }: { rows: { kind: DetailKind; value: string }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ kind: DetailKind; x: number; top: number } | null>(null);
  const [width, setWidth] = useState(320);

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
      if (!(e.target as HTMLElement).closest?.("[data-detail-row], [data-badge-tip]")) setTip(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  if (rows.length === 0) return null;
  const k = tip ? KINDS[tip.kind] : null;

  return (
    <div ref={box} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r) => (
        <button
          key={r.kind}
          type="button"
          data-detail-row
          aria-label={`${KINDS[r.kind].title}: ${r.value}`}
          onClick={(e) => {
            const el = e.currentTarget;
            setTip((t) => (t?.kind === r.kind ? null : { kind: r.kind, x: 22, top: el.offsetTop + el.offsetHeight + 4 }));
          }}
          style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "left" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/badges/set/${KINDS[r.kind].art}.png`} alt="" style={{ flex: "none", imageRendering: "pixelated", display: "block", marginTop: 0 }} />
          <span style={{ fontSize: 12.5, lineHeight: "23px", color: "var(--text-2)", minWidth: 0 }}>{r.value}</span>
        </button>
      ))}
      {k && tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={k.title} line={k.line} /> : null}
    </div>
  );
}
