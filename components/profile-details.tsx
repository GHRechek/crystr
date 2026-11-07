"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeTip } from "@/components/badge-tip";
import { EmojiImg } from "@/components/emoji-img";

/** What each detail is: a small picture, and what a tap on it says. */
// A badge-set picture (art), or one of the pixel emoji, in the CRYSTR colours or as drawn.
const KINDS: Record<string, { art?: number; emoji?: string; crystr?: boolean; title: string; line: string }> = {
  birthday: { art: 130, crystr: true, title: "BIRTHDAY", line: "Their birthday." },
  likes: { emoji: "pm-54", crystr: true, title: "LIKES", line: "What they like." },
  dislikes: { emoji: "pm-53", crystr: true, title: "DISLIKES", line: "What they don't." },
  food: { emoji: "pm-69", crystr: true, title: "FAVOURITE FOOD", line: "Their favourite food." },
  obsession: { emoji: "pm-59", title: "OBSESSED WITH", line: "What they are obsessed with right now." },
};

export type DetailKind = "birthday" | "likes" | "dislikes" | "food" | "obsession";

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
    <div ref={box} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 2 }}>
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
          <span style={{ flex: "none", width: 23, height: 21, display: "grid", placeItems: "center" }}>
            {KINDS[r.kind].emoji ? (
              <EmojiImg e={KINDS[r.kind].emoji!} crystr={KINDS[r.kind].crystr} size={18} />
            ) : (
              <EmojiImg e={`art-${KINDS[r.kind].art}`} from={`/badges/set/${KINDS[r.kind].art}.png`} crystr={KINDS[r.kind].crystr} size={21} />
            )}
          </span>
          <span style={{ fontSize: 12.5, lineHeight: "21px", color: "var(--text-2)", minWidth: 0 }}>{r.value}</span>
        </button>
      ))}
      {k && tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={k.title} line={k.line} /> : null}
    </div>
  );
}
