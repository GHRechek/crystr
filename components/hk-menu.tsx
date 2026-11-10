"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { TypeIcon } from "@/components/encounter";
import { setLineup } from "@/lib/actions";
import { HISTORIKAL, RARITIES, RARITY_COLOR, RARITY_NAME, TYPES, type Element, type Rarity } from "@/lib/historikals";
import type { ShownBadge } from "@/lib/badges";

const LINEUP = 4;
const EDGE = "min(10vw, 48px)";

/** A pixel pencil: the edit button on the lineup. */
function PencilIcon({ size = 16 }: { size?: number }) {
  const rows = [".....##", "....#.#", "...#..#", "..#..#.", ".#..#..", "#..#...", "#.#....", "##....."];
  return (
    <svg width={size} height={size} viewBox="0 0 7 8" shapeRendering="crispEdges" fill="currentColor" aria-hidden style={{ display: "block" }}>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}

type Item = { label: string; go: () => void; n?: number; cls?: string };

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
  const [editing, setEditing] = useState(false);
  const [rar, setRar] = useState<Rarity | null>(null);
  const [type, setType] = useState<Element | null>(null);
  const [lineup, setLineupKeys] = useState<(string | null)[]>(() => {
    const hk = shown.filter((b) => b.hk).map((b) => b.key);
    return Array.from({ length: LINEUP }, (_, i) => hk[i] ?? null);
  });
  const [, start] = useTransition();
  const byKey = useMemo(() => new Map([...tradable, ...shown].map((b) => [b.key, b])), [tradable, shown]);
  const rarityOf = (b: ShownBadge): Rarity | undefined => (b.hk ? HISTORIKAL.get(b.hk.slug)?.rarity : undefined);
  const typesOf = (b: ShownBadge): Element[] => b.hk?.types ?? (b.hk ? HISTORIKAL.get(b.hk.slug)?.types ?? [] : []);

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
  const add = (key: string) => {
    if (lineup.includes(key)) return;
    const free = lineup.indexOf(null);
    if (free >= 0) place(key, free);
  };

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
      if (!p.dragging) { if (p.from === "grid") add(p.key); else takeOff(p.from); return; }
      const hit = document.elementsFromPoint(e.clientX, e.clientY).map((el) => (el as HTMLElement).closest?.("[data-slot]") as HTMLElement | null).find(Boolean);
      if (hit) place(p.key, Number(hit.dataset.slot));
      else if (p.from !== "grid") takeOff(p.from);
    },
    onPointerCancel: () => { press.current = null; setGhost(null); },
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  });

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const held = tradable.filter((b) => b.hk && (!rar || rarityOf(b) === rar) && (!type || typesOf(b).includes(type)));
  const slotPx = 56;

  return (
    <>
      <button type="button" aria-label="Close the menu" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(5,5,12,.55)", border: 0, cursor: "default" }} />
      <div role="dialog" aria-label="Historikals" className="hk-panel" style={{ position: "fixed", top: EDGE, left: "50%", transform: "translateX(-50%)", width: `min(80vw, calc(480px - 2 * ${EDGE}))`, maxHeight: `calc(100vh - 2 * ${EDGE})`, zIndex: 41, display: "flex", flexDirection: "column", background: "var(--blk-pur)", boxShadow: "4px 4px 0 #0a0616", overflow: "hidden" }}>
        {/* The lineup, on top in both views. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 4px" }}>
          <span className="px" style={{ fontSize: 10, color: "#e0398a", letterSpacing: ".06em" }}>{editing ? "YOUR LINEUP · DRAG ONE UP, TAP A SLOT TO CLEAR IT" : "YOUR LINEUP"}</span>
          <span style={{ flex: 1 }} />
          {editing ? (
            <button type="button" className="px" onClick={() => setEditing(false)} style={{ background: "none", border: 0, color: "#fff", fontSize: 10, letterSpacing: ".06em", padding: "6px 8px", cursor: "pointer" }}>← BACK</button>
          ) : (
            <button type="button" aria-label="Edit your lineup" title="Edit lineup" onClick={() => setEditing(true)} style={{ background: "rgba(255,255,255,.08)", border: 0, color: "#fff", width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}><PencilIcon /></button>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, padding: "6px 14px 12px" }}>
          {lineup.map((k, i) => {
            const b = k ? byKey.get(k) : undefined;
            return (
              <span key={i} data-slot={editing ? i : undefined} style={{ width: slotPx, height: slotPx, display: "grid", placeItems: "center", outline: editing ? "1px dashed rgba(255,255,255,.35)" : "none", outlineOffset: -1, background: editing && !b ? "rgba(255,255,255,.04)" : "none" }}>
                {b ? (
                  editing ? <button type="button" className="bv-item" {...handlers(b, i)} aria-label={`${b.title}: drag to move, tap to take off`}><BadgeFace b={b} size={slotPx - 8} /></button>
                    : <BadgeFace b={b} size={slotPx - 8} />
                ) : <span className="px" style={{ fontSize: 14, color: "rgba(255,255,255,.3)" }}>{i + 1}</span>}
              </span>
            );
          })}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 14px 14px", overflowY: "auto", minHeight: 0 }}>
            {/* Rarity: a circle per rarity in its colour; the chosen one stands on a CRYSTR line. */}
            <div role="group" aria-label="Rarity" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {RARITIES.map((r) => {
                const on = rar === r;
                return (
                  <button key={r} type="button" aria-pressed={on} aria-label={RARITY_NAME[r]} title={RARITY_NAME[r]} onClick={() => setRar(on ? null : r)} style={{ background: "none", border: 0, padding: "4px 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: RARITY_COLOR[r], boxShadow: on ? "0 0 0 2px var(--blk-pur), 0 0 0 3px #fff" : "none", opacity: rar && !on ? 0.45 : 1 }} />
                    <span aria-hidden style={{ width: 22, height: 3, background: on ? "linear-gradient(90deg, #e0398a, #9184d9 52%, #4c7df0)" : "transparent" }} />
                  </button>
                );
              })}
            </div>
            {/* Type: the seven icons; the chosen one stands on the same line. */}
            <div role="group" aria-label="Type" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {TYPES.map((t) => {
                const on = type === t;
                return (
                  <button key={t} type="button" aria-pressed={on} aria-label={t} title={t} onClick={() => setType(on ? null : t)} style={{ background: on ? "rgba(255,255,255,.1)" : "none", border: 0, padding: "4px 5px 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: type && !on ? 0.45 : 1 }}>
                    <TypeIcon type={t} k={2} />
                    <span aria-hidden style={{ width: 18, height: 3, background: on ? "linear-gradient(90deg, #e0398a, #9184d9 52%, #4c7df0)" : "transparent" }} />
                  </button>
                );
              })}
            </div>
            {/* Everything you hold, filtered. The ones already in the lineup sit dim. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 6 }}>
              {held.length === 0 ? <span className="px" style={{ fontSize: 10, color: "rgba(255,255,255,.5)", gridColumn: "1 / -1" }}>NONE LIKE THAT</span> : null}
              {held.map((b) => {
                const inLineup = lineup.includes(b.key);
                const ko = (b.hk?.hp ?? 1) <= 0;
                return (
                  <button key={b.key} type="button" className="bv-item" {...handlers(b, "grid")} aria-label={`${b.title}${inLineup ? ", in your lineup" : ko ? ", knocked out" : ""}`} style={{ opacity: inLineup ? 0.35 : 1, filter: ko ? "grayscale(1) brightness(.6)" : undefined, display: "grid", placeItems: "center", height: 56 }}>
                    <BadgeFace b={b} size={44} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div role="menu" style={{ display: "flex", flexDirection: "column", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)" }}>
            {items.map(({ label, go, n, cls }) => (
              <button key={label} type="button" role="menuitem" disabled={n === 0} className={`px hk-row${label.startsWith("★") ? " epic" : ""}${cls ? ` ${cls}` : ""}`} onClick={() => { onClose(); go(); }}>
                {label}{n !== undefined ? <b className="hk-n">{n}</b> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      {ghost ? (
        <div aria-hidden style={{ position: "fixed", left: ghost.x - 24, top: ghost.y - 24, zIndex: 60, pointerEvents: "none", filter: "drop-shadow(3px 3px 0 #0a0616)" }}>
          <BadgeFace b={ghost.b} size={48} />
        </div>
      ) : null}
    </>
  );
}
