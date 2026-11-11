"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { BadgeFace } from "@/components/badge-chooser";
import { TradeIcon } from "@/components/about-badges";
import { Stats, TypeIcon } from "@/components/encounter";
import { HistorikalCard } from "@/components/historikal-card";
import { HistorikalCollection, type HeldHk } from "@/components/historikal-collection";
import { RecycleBar } from "@/components/recycle-bar";
import { recycleHistorikals, setLineup } from "@/lib/actions";
import { HISTORIKAL, RARITY_NAME, type Rarity } from "@/lib/historikals";
import { useRouter } from "next/navigation";
import type { ShownBadge } from "@/lib/badges";

const LINEUP = 4;
const EDGE = "min(10vw, 48px)";
/** The panel sits a little lower than the side gap, clear of the top bar. */
const TOP = `calc(${EDGE} + 18px)`;

/** Two small pixel marks for the header: an i in a ring (a card) and a question mark (an empty slot). */
function Px({ rows, k, fill }: { rows: string[]; k: number; fill: string }) {
  return (
    <svg width={rows[0].length * k} height={rows.length * k} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" fill={fill} aria-hidden style={{ flex: "none", display: "inline-block", verticalAlign: "middle" }}>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}
const INFO = [".#####.", "#.....#", "#..#..#", "#.....#", "#..#..#", "#..#..#", "#..#..#", "#.....#", ".#####."];
const QMARK = [".####.", "#....#", "#....#", "....#.", "...#..", "..#...", "..#...", "......", "..#..."];

type Item = { label: string; go?: () => void; n?: number; cls?: string; /** Opens a view inside the panel instead. */ view?: "all" };

/** The Historikals menu, from the button beside the portrait: a panel eight tenths of the screen wide, as
 *  far from the top as from the sides. Your lineup leads, with a pencil to change it; then the actions.
 *  The pencil turns the panel into the lineup editor: the four slots stay on top, and under them, behind
 *  a rarity row and a type row, every Historikal you hold, to drag into a slot (or tap: it takes the
 *  first free one). Tap a slot to empty it. Every change saves. BACK returns to the actions. */
export function HkMenu({ shown, tradable, items, startOn = "menu", onClose }: {
  /** Your display as it is: Historikals in it are the lineup, in order; the rest are badges and stay put. */
  shown: ShownBadge[];
  /** Every Historikal you hold. */
  tradable: ShownBadge[];
  items: Item[];
  /** Open straight on MY HISTORIKALS (from a card's EDIT LINEUP). */
  startOn?: "menu" | "all";
  onClose: () => void;
}) {
  const [view, setView] = useState<"menu" | "all">(startOn);
  // Where the screen (between the top bar and the tab bar) sits in the viewport: the panel keeps to it.
  const [area, setArea] = useState<{ top: number; bottom: number }>({ top: 0, bottom: 0 });
  useLayoutEffect(() => {
    const read = () => {
      const r = document.querySelector(".screen")?.getBoundingClientRect();
      setArea(r ? { top: r.top, bottom: r.bottom } : { top: 0, bottom: window.innerHeight });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  // A tapped Historikal, in the lineup or the list: its card, where hurt ones are healed.
  const [card, setCard] = useState<HeldHk | null>(null);
  const [lineup, setLineupKeys] = useState<(string | null)[]>(() => {
    const hk = shown.filter((b) => b.hk).map((b) => b.key);
    return Array.from({ length: LINEUP }, (_, i) => hk[i] ?? null);
  });
  const [, start] = useTransition();
  const router = useRouter();
  // RECYCLE: the four auras under the list, and what they hold. Tap the symbol: with fewer than four it
  // explains; with four it asks, and only YES, I'M SURE goes through. A note (title, body, maybe a yes)
  // sits over the panel meanwhile.
  const [bin, setBin] = useState<(string | null)[]>([null, null, null, null]);
  const [note, setNote] = useState<{ title: string; body: string; yes?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
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

  // Drag: hold a creature (a third of a second, still) to pick it up; let go over a slot to drop it there.
  // A tap opens its card and a quick swipe scrolls, as they would anywhere.
  const press = useRef<{ key: string; from: number | "grid"; x: number; y: number; dragging: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const [ghost, setGhost] = useState<{ b: ShownBadge; x: number; y: number } | null>(null);
  const handlers = (b: ShownBadge, from: number | "grid") => ({
    onPointerDown: (e: React.PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      const id = e.pointerId;
      const p = { key: b.key, from, x: e.clientX, y: e.clientY, dragging: false, timer: null as ReturnType<typeof setTimeout> | null };
      p.timer = setTimeout(() => {
        if (press.current !== p) return;
        p.dragging = true;
        el.setPointerCapture?.(id);
        try { navigator.vibrate?.(12); } catch { /* no buzz, no matter */ }
        setGhost({ b, x: p.x, y: p.y });
      }, 320);
      press.current = p;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (p.dragging) { setGhost({ b, x: e.clientX, y: e.clientY }); return; }
      // Moved before the hold was up: a scroll, not a drag.
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) { if (p.timer) clearTimeout(p.timer); press.current = null; }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const p = press.current; press.current = null; setGhost(null);
      if (!p) return;
      if (p.timer) clearTimeout(p.timer);
      if (!p.dragging) return;   // a tap: the button's own click opens the card
      dragged.current = true;
      const under = document.elementsFromPoint(e.clientX, e.clientY);
      const hit = under.map((el) => (el as HTMLElement).closest?.("[data-slot]") as HTMLElement | null).find(Boolean);
      const aura = under.map((el) => (el as HTMLElement).closest?.("[data-spot]") as HTMLElement | null).find(Boolean);
      if (hit) place(p.key, Number(hit.dataset.slot));
      else if (aura) toBin(p.key, Number(aura.dataset.spot));
      else if (p.from !== "grid") takeOff(p.from);
    },
    onPointerCancel: () => { const p = press.current; if (p?.timer) clearTimeout(p.timer); press.current = null; setGhost(null); },
    onClickCapture: (e: React.MouseEvent) => { if (dragged.current) { dragged.current = false; e.preventDefault(); e.stopPropagation(); } },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  });
  const dragged = useRef(false);
  const badgeOf = (h: HeldHk) => byKey.get(`i:${h.id}`);

  // Into an aura: not from the lineup, not a favourite (the database refuses both too).
  const toBin = (key: string, spot: number) => {
    const b = byKey.get(key);
    if (!b?.hk) return;
    if (lineup.includes(key)) { setNote({ title: "IN YOUR LINEUP", body: "Take it off your lineup first." }); return; }
    if (b.hk.favorite) { setNote({ title: "A FAVOURITE", body: "Un-favourite it first, if you mean it." }); return; }
    const rar = HISTORIKAL.get(b.hk.slug)?.rarity;
    if (rar === "epic" || rar === "legendary") { setNote({ title: "TOO RARE", body: `${RARITY_NAME[rar].toUpperCase()}S can't be recycled. Commons, uncommons and rares only.` }); return; }
    setBin((cur) => { const next = cur.map((k) => (k === key ? null : k)); next[spot] = key; return next; });
  };
  const binned = bin.map((k) => (k ? byKey.get(k) ?? null : null));
  const binIds = binned.flatMap((b) => (b?.hk ? [b.hk.id] : []));
  const recycle = () => {
    if (busy) return;
    const held = binned.filter((b): b is ShownBadge => !!b?.hk);
    if (held.length < 4) {
      setNote({ title: "RECYCLE", body: "Drop four Historikals of one rarity into the auras and they become one of the next rarity up, chosen by chance. Now and then one evolves instead. Commons, uncommons and rares only: epics and mythics can't go in." });
      return;
    }
    const rars = new Set(held.map((b) => HISTORIKAL.get(b.hk!.slug)?.rarity));
    if (rars.size > 1) { setNote({ title: "ONE RARITY", body: "All four must share a rarity. Swap one out." }); return; }
    const rar = [...rars][0] as Rarity;
    if (rar === "epic" || rar === "legendary") { setNote({ title: "TOO RARE", body: "Epics and mythics can't be recycled." }); return; }
    const up = (["common", "uncommon", "rare", "epic", "legendary"] as Rarity[])[["common", "uncommon", "rare", "epic"].indexOf(rar) + 1];
    setNote({
      title: "ARE YOU SURE?",
      body: `You'll lose these four ${RARITY_NAME[rar]}s for good. One ${RARITY_NAME[up]} comes out, and chance decides which.`,
      yes: () => {
        setNote(null); setBusy(true);
        start(async () => {
          const r = await recycleHistorikals(binIds);
          setBusy(false);
          if (!r.ok) {
            const why: Record<string, string> = { mixed: "All four must share a rarity.", top: "Epics and mythics can't be recycled.", favorite: "One of them is a favourite.", lineup: "One of them is in your lineup.", in_battle: "One of them is in a battle.", not_yours: "One of them has moved on.", none: "There is nothing to be had just now." };
            setNote({ title: "NOT THIS TIME", body: why[r.code] ?? "Something went wrong. Try again." });
            return;
          }
          setBin([null, null, null, null]);
          const h = HISTORIKAL.get(r.slug);
          const rolled = r.rolled && h?.rnd ? (r.rolled as HeldHk["types"][number]) : null;
          const types = h ? (rolled ? [...new Set([rolled, ...h.types.slice(1)])] : h.types) : [];
          router.refresh();
          if (h) setCard({ id: r.item, slug: r.slug, name: h.name, rarity: h.rarity, types, hearts: h.hearts, hp: h.hearts, favorite: false });
          setNote({ title: r.evolved ? "IT EVOLVED!" : "RECYCLED!", body: `${r.name.toUpperCase()} joins your Historikals.` });
        });
      },
    });
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  // Every one you hold, as the collection shows them: the creature's name, rarity and hearts, its rolled types.
  const all: HeldHk[] = tradable.flatMap((b) => {
    const h = b.hk ? HISTORIKAL.get(b.hk.slug) : undefined;
    return b.hk && h ? [{ id: b.hk.id, slug: h.slug, name: h.name, rarity: h.rarity, types: b.hk.types ?? h.types, hearts: h.hearts, hp: b.hk.hp, favorite: b.hk.favorite }] : [];
  });
  const slotPx = 56;

  // Through a portal to the body: inside the page, the low-mana filter on the decay wrapper would turn
  // position: fixed into page-relative, and the panel would scroll away with the profile.
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <button type="button" aria-label="Close the menu" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(5,5,12,.93)", border: 0, cursor: "default", touchAction: "none" }} />
      {view === "all" ? (
        // Just above the box: BACK, then how it works, in one line, centred over the panel.
        <div style={{ position: "fixed", top: `calc(${area.top}px + ${TOP} - 50px)`, left: "50%", transform: "translateX(-50%)", width: "min(80vw, 320px)", zIndex: 41, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, pointerEvents: "none" }}>
          <button type="button" className="px" onClick={() => setView("menu")} style={{ background: "none", border: 0, padding: "4px 6px 4px 0", fontSize: 14, letterSpacing: ".04em", cursor: "pointer", whiteSpace: "nowrap", flex: "none", pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}><span className="crystr-text" style={{ fontSize: 18, lineHeight: 1 }}>←</span><span className="crystr-text">BACK</span></button>
          <span className="px" style={{ fontSize: 10, color: "#e0398a", letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            TAP FOR <Px rows={INFO} k={1.5} fill="#e0398a" /> OR HOLD &amp; DRAG <span style={{ display: "flex", transform: "translateY(-1px)" }}><TradeIcon size={12} /></span> TO ALTER LINEUP
          </span>
        </div>
      ) : null}
      <div role="dialog" aria-label="Historikals" className="hk-panel" style={{ position: "fixed", top: `calc(${area.top}px + ${TOP} - 12px)`, height: `calc(${area.bottom - area.top}px - ${TOP} - ${EDGE} + 12px)`, left: "50%", transform: "translateX(-50%)", width: "min(80vw, 320px)", maxHeight: `calc(${area.bottom - area.top}px - ${TOP} - ${EDGE} + 12px)`, zIndex: 41, display: "flex", flexDirection: "column", background: "var(--blk-pur)", boxShadow: "4px 4px 0 #0a0616", overflow: "hidden" }}>
        {/* On top in both views: the lineup. In MY HISTORIKALS the slots take a drop. */}
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, padding: "6px 14px 12px" }}>
          {lineup.map((k, i) => {
            const b = k ? byKey.get(k) : undefined;
            const h = b?.hk ? HISTORIKAL.get(b.hk.slug) : undefined;
            const hp = b?.hk?.hp ?? 0;
            const ko = !!h && hp <= 0;
            const held = b?.hk && h ? all.find((x) => x.id === b.hk!.id) : undefined;
            const editing = view === "all";
            return (
              <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: slotPx, maxWidth: slotPx + 16 }}>
                <span data-slot={editing ? i : undefined} style={{ width: slotPx, height: slotPx, display: "grid", placeItems: "center", filter: ko ? "grayscale(1) brightness(.55)" : undefined }}>
                  {b ? (
                    // A tap opens its card: moves, hearts, and HEAL or REVIVE when it needs it. In MY HISTORIKALS a
                    // drag moves it to another slot, or off the lineup when let go anywhere else.
                    <button type="button" className="bv-item" {...(editing ? handlers(b, i) : {})} onClick={() => held && setCard(held)} style={{ visibility: ghost?.b.key === b.key ? "hidden" : "visible" }} aria-label={`${b.title}${ko ? ", knocked out" : ""}: open its card${editing ? "; drag to move it" : ""}`}><BadgeFace b={b} size={slotPx - 8} /></button>
                  ) : <span className="hk-wobble" style={{ display: "inline-block" }}><Px rows={QMARK} k={3} fill="rgba(255,255,255,.45)" /></span>}
                </span>
                {/* Its types, small, then its name on the same line; then its hearts, the lost ones hollow. Healing is on its card. */}
                {b?.hk && h ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, maxWidth: "100%" }}>
                    <span style={{ display: "flex", gap: 1, flex: "none" }}>{(b.hk.types ?? h.types).map((t) => <TypeIcon key={t} type={t} k={1} />)}</span>
                    <span className="px" style={{ fontSize: 8, color: "#fff", letterSpacing: ".03em", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{h.name.toUpperCase()}</span>
                  </span>
                ) : null}
                {b?.hk && h ? (
                  <Stats h={{ id: 0, slug: h.slug, name: h.name, rarity: h.rarity, types: b.hk.types ?? h.types, hearts: h.hearts }} hp={hp} k={1.25} only="hearts" fav={!!b.hk.favorite} />
                ) : null}
              </span>
            );
          })}
        </div>

        {view === "all" ? (
          <>
          <div aria-hidden style={{ flex: "none", height: 1, margin: "0 0 8px", background: "linear-gradient(90deg, #e0398a, #9184d9 52%, #4c7df0)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 14px 14px", overflowY: "auto", minHeight: 0, overscrollBehavior: "contain", flex: 1 }}>
            {all.length === 0 ? <span className="px" style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>NO HISTORIKALS YET</span> : (
              <HistorikalCollection list={all.filter((h) => !bin.includes(`i:${h.id}`))} dense ring="var(--blk-pur)" inLineup={(h) => lineup.includes(`i:${h.id}`)} drag={(h) => { const b = badgeOf(h); return b ? handlers(b, "grid") : {}; }} lifted={(h) => ghost?.b.key === `i:${h.id}`} onOpen={setCard} />
            )}
          </div>
          <RecycleBar spots={binned} onClear={(i) => setBin((cur) => { const next = [...cur]; next[i] = null; return next; })} onRecycle={recycle} />
          </>
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
      {card ? <HistorikalCard hk={{ id: card.id, slug: card.slug, hp: card.hp, types: card.types, favorite: card.favorite }} own onClose={() => setCard(null)} onFavorite={(on) => setCard({ ...card, favorite: on })} /> : null}
      {note ? (
        <div role="alertdialog" aria-label={note.title} onClick={() => setNote(null)} style={{ position: "fixed", inset: 0, zIndex: 96, background: "rgba(5,3,12,.7)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(80vw, 300px)", background: "var(--blk-pur)", boxShadow: "4px 4px 0 #0a0616", padding: "18px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="px crystr-text" style={{ fontSize: 13, letterSpacing: ".06em" }}>{note.title}</span>
            <span className="px" style={{ fontSize: 9.5, lineHeight: 1.8, color: "#fff", letterSpacing: ".03em" }}>{note.body}</span>
            {note.yes ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="px" onClick={note.yes} style={{ flex: 1, minHeight: 40, border: 0, cursor: "pointer", background: "#e0398a", color: "#fff", fontSize: 10, letterSpacing: ".06em", boxShadow: "3px 3px 0 #0a0616" }}>YES, I&apos;M SURE</button>
                <button type="button" className="px" onClick={() => setNote(null)} style={{ flex: 1, minHeight: 40, border: 0, cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 10, letterSpacing: ".06em", boxShadow: "3px 3px 0 #0a0616" }}>NO</button>
              </div>
            ) : (
              <button type="button" className="px" onClick={() => setNote(null)} style={{ minHeight: 40, border: 0, cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 10, letterSpacing: ".06em", boxShadow: "3px 3px 0 #0a0616" }}>OK</button>
            )}
          </div>
        </div>
      ) : null}
      {ghost ? (
        // The picked-up creature rides above the finger, bigger, so you can see it is yours to drop.
        <div aria-hidden className="hk-lift" style={{ position: "fixed", left: ghost.x - 30, top: ghost.y - 66, zIndex: 60, pointerEvents: "none", filter: "drop-shadow(4px 4px 0 #0a0616)" }}>
          <BadgeFace b={ghost.b} size={60} />
        </div>
      ) : null}
    </>,
    document.body,
  );
}
