"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { TradeIcon } from "@/components/about-badges";
import { Stats } from "@/components/encounter";
import { HistorikalCard } from "@/components/historikal-card";
import { HistorikalCollection, type HeldHk } from "@/components/historikal-collection";
import { setLineup } from "@/lib/actions";
import { HISTORIKAL } from "@/lib/historikals";
import type { ShownBadge } from "@/lib/badges";

const LINEUP = 4;
const EDGE = "min(10vw, 48px)";
/** The panel sits a little lower than the side gap, clear of the top bar. */
const TOP = `calc(${EDGE} + 18px)`;

type Item = { label: string; go?: () => void; n?: number; cls?: string; /** Opens a view inside the panel instead. */ view?: "all" };

/** The Historikals menu, from the button beside the portrait: a panel eight tenths of the screen wide, as
 *  far from the top as from the sides. Your lineup leads, with a pencil to change it; then the actions.
 *  The pencil turns the panel into the lineup editor: the four slots stay on top, and under them, behind
 *  a rarity row and a type row, every Historikal you hold, to drag into a slot (or tap: it takes the
 *  first free one). Tap a slot to empty it. Every change saves. BACK returns to the actions. */
export function HkMenu({ shown, tradable, items, onClose }: {
  /** Your display as it is: Historikals in it are the lineup, in order; the rest are badges and stay put. */
  shown: ShownBadge[];
  /** Every Historikal you hold. */
  tradable: ShownBadge[];
  items: Item[];
  onClose: () => void;
}) {
  const [view, setView] = useState<"menu" | "all">("menu");
  // A tapped Historikal, in the lineup or the list: its card, where hurt ones are healed.
  const [card, setCard] = useState<HeldHk | null>(null);
  const [lineup, setLineupKeys] = useState<(string | null)[]>(() => {
    const hk = shown.filter((b) => b.hk).map((b) => b.key);
    return Array.from({ length: LINEUP }, (_, i) => hk[i] ?? null);
  });
  const [, start] = useTransition();
  const byKey = useMemo(() => new Map([...tradable, ...shown].map((b) => [b.key, b])), [tradable, shown]);

  // Save: the new lineup takes the Historikal places in the display, in order; the badges keep theirs.
  const save = (next: (string | null)[]) => {
    setLineupKeys(next);
    const keep = shown.filter((b) => !b.hk).map((b) => b.key);
    const list = [...next.filter((k): k is string => !!k), ...keep].slice(0, 5);
    start(() => { void setLineup(list); });
  };
  const place = (key: string, slot: number) => {
    const next = [...lineup];
    const was = next.indexOf(key);
    if (was >= 0) next[was] = next[slot];   // from another slot: swap
    next[slot] = key;
    save(next);
  };
  const takeOff = (slot: number) => { const next = [...lineup]; next[slot] = null; save(next); };

  // Drag: press and move picks a creature up; let go over a slot drops it there.
  const press = useRef<{ key: string; from: number | "grid"; x: number; y: number; dragging: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ b: ShownBadge; x: number; y: number } | null>(null);
  const handlers = (b: ShownBadge, from: number | "grid") => ({
    onPointerDown: (e: React.PointerEvent) => { press.current = { key: b.key, from, x: e.clientX, y: e.clientY, dragging: false }; },
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) { p.dragging = true; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }
      if (p.dragging) setGhost({ b, x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e: React.PointerEvent) => {
      const p = press.current; press.current = null; setGhost(null);
      if (!p) return;
      if (!p.dragging) return;   // a tap: the button's own click opens the card
      dragged.current = true;
      const hit = document.elementsFromPoint(e.clientX, e.clientY).map((el) => (el as HTMLElement).closest?.("[data-slot]") as HTMLElement | null).find(Boolean);
      if (hit) place(p.key, Number(hit.dataset.slot));
      else if (p.from !== "grid") takeOff(p.from);
    },
    onPointerCancel: () => { press.current = null; setGhost(null); },
    onClickCapture: (e: React.MouseEvent) => { if (dragged.current) { dragged.current = false; e.preventDefault(); e.stopPropagation(); } },
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  });
  const dragged = useRef(false);
  const badgeOf = (h: HeldHk) => byKey.get(`i:${h.id}`);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  // Every one you hold, as the collection shows them: the creature's name, rarity and hearts, its rolled types.
  const all: HeldHk[] = tradable.flatMap((b) => {
    const h = b.hk ? HISTORIKAL.get(b.hk.slug) : undefined;
    return b.hk && h ? [{ id: b.hk.id, slug: h.slug, name: h.name, rarity: h.rarity, types: b.hk.types ?? h.types, hearts: h.hearts, hp: b.hk.hp }] : [];
  });
  const slotPx = 56;

  return (
    <>
      <button type="button" aria-label="Close the menu" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(5,5,12,.55)", border: 0, cursor: "default" }} />
      <div role="dialog" aria-label="Historikals" className="hk-panel" style={{ position: "fixed", top: TOP, height: view === "all" ? `calc(100vh - ${TOP} - ${EDGE})` : undefined, left: "50%", transform: "translateX(-50%)", width: `min(80vw, calc(480px - 2 * ${EDGE}))`, maxHeight: `calc(100vh - ${TOP} - ${EDGE})`, zIndex: 41, display: "flex", flexDirection: "column", background: "var(--blk-pur)", boxShadow: "4px 4px 0 #0a0616", overflow: "hidden" }}>
        {/* On top in both views: the lineup. In MY HISTORIKALS the slots take a drop. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 4px" }}>
          <span className="px" style={{ fontSize: 10, color: "#e0398a", letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 5 }}>
            {view === "all" ? <>DRAG &amp; DROP <TradeIcon size={12} /> TO ALTER LINEUP</> : "YOUR LINEUP"}
          </span>
          <span style={{ flex: 1 }} />
          {view === "all" ? (
            <button type="button" className="px" onClick={() => setView("menu")} style={{ background: "none", border: 0, color: "#fff", fontSize: 10, letterSpacing: ".06em", padding: "6px 8px", cursor: "pointer" }}>← BACK</button>
          ) : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, padding: "6px 14px 12px" }}>
          {lineup.map((k, i) => {
            const b = k ? byKey.get(k) : undefined;
            const h = b?.hk ? HISTORIKAL.get(b.hk.slug) : undefined;
            const hp = b?.hk?.hp ?? 0;
            const ko = !!h && hp <= 0;
            const held = b?.hk && h ? all.find((x) => x.id === b.hk!.id) : undefined;
            const editing = view === "all";
            return (
              <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: slotPx }}>
                <span data-slot={editing ? i : undefined} style={{ width: slotPx, height: slotPx, display: "grid", placeItems: "center", outline: editing ? "1px dashed rgba(255,255,255,.35)" : "none", outlineOffset: -1, background: editing && !b ? "rgba(255,255,255,.04)" : "none", filter: ko ? "grayscale(1) brightness(.55)" : undefined }}>
                  {b ? (
                    // A tap opens its card: moves, hearts, and HEAL or REVIVE when it needs it. In MY HISTORIKALS a
                    // drag moves it to another slot, or off the lineup when let go anywhere else.
                    <button type="button" className="bv-item" {...(editing ? handlers(b, i) : {})} onClick={() => held && setCard(held)} aria-label={`${b.title}${ko ? ", knocked out" : ""}: open its card${editing ? "; drag to move it" : ""}`}><BadgeFace b={b} size={slotPx - 8} /></button>
                  ) : <span className="px" style={{ fontSize: 14, color: "rgba(255,255,255,.3)" }}>{i + 1}</span>}
                </span>
                {/* Its hearts, the lost ones hollow. Healing is on its card. */}
                {b?.hk && h ? (
                  <Stats h={{ id: 0, slug: h.slug, name: h.name, rarity: h.rarity, types: b.hk.types ?? h.types, hearts: h.hearts }} hp={hp} k={1.25} only="hearts" />
                ) : null}
              </span>
            );
          })}
        </div>

        {view === "all" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 14px 14px", overflowY: "auto", minHeight: 0 }}>
            {all.length === 0 ? <span className="px" style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>NO HISTORIKALS YET</span> : (
              <HistorikalCollection list={all} ring="var(--blk-pur)" inLineup={(h) => lineup.includes(`i:${h.id}`)} drag={(h) => { const b = badgeOf(h); return b ? handlers(b, "grid") : {}; }} onOpen={setCard} />
            )}
          </div>
        ) : (
          <div role="menu" style={{ display: "flex", flexDirection: "column", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)" }}>
            {items.map(({ label, go, n, cls, view }) => (
              <button key={label} type="button" role="menuitem" disabled={n === 0} className={`px hk-row${label.startsWith("★") ? " epic" : ""}${cls ? ` ${cls}` : ""}`} onClick={() => { if (view) setView(view); else { onClose(); go?.(); } }}>
                {label}{n !== undefined ? <b className="hk-n">{n}</b> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      {card ? <HistorikalCard hk={{ id: card.id, slug: card.slug, hp: card.hp, types: card.types }} own onClose={() => setCard(null)} /> : null}
      {ghost ? (
        <div aria-hidden style={{ position: "fixed", left: ghost.x - 24, top: ghost.y - 24, zIndex: 60, pointerEvents: "none", filter: "drop-shadow(3px 3px 0 #0a0616)" }}>
          <BadgeFace b={ghost.b} size={48} />
        </div>
      ) : null}
    </>
  );
}
