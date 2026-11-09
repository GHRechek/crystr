"use client";

import { useRef, useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { setShownBadges } from "@/lib/actions";
import { HistorikalCard } from "@/components/historikal-card";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";
import { useDecay } from "@/components/decay";
import { corrupt } from "@/lib/crystr";

/** Historikals in the display are your lineup: the four you battle with. */
const LINEUP = 4;

type From = "grid" | number;

/** Every badge a person has, full screen, in two tabs: earned and Historikals. Tap one to read what it
 *  is (a Historikal opens its card). On your own page (`editable`) the display sits on top, five slots:
 *  everything below floats gently, and you drag what you want shown up into a slot. Historikals in the
 *  display, up to four, are your lineup, in the order they sit. Drag between slots to rearrange, drag
 *  out (or tap a slot) to take it off, and SAVE keeps it. */
export function BadgeViewer({
  earned,
  tradable,
  current,
  editable,
  aside,
  onClose,
  inline,
}: {
  earned: ShownBadge[];
  tradable: ShownBadge[];
  current: string[];
  editable?: boolean;
  aside?: React.ReactNode;
  onClose?: () => void;
  /** Sit in the page instead of covering it: no close button, and the page scrolls. */
  inline?: boolean;
}) {
  const decay = useDecay();
  const [tab, setTab] = useState(0);
  const [slots, setSlots] = useState<(string | null)[]>(() => Array.from({ length: SHOW_MAX }, (_, i) => current[i] ?? null));
  const [last, setLast] = useState<ShownBadge | null>(null);
  const [card, setCard] = useState<ShownBadge | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ b: ShownBadge; x: number; y: number } | null>(null);
  const press = useRef<{ b: ShownBadge; from: From; x: number; y: number; dragging: boolean } | null>(null);

  const all = [...earned, ...tradable];
  const byKey = (k: string | null) => (k ? all.find((b) => b.key === k) : undefined);
  const pick = slots.filter((k): k is string => !!k);
  const lineup = pick.filter((k) => k.startsWith("i:"));
  const list = tab === 0 ? earned : tradable;

  /** Put a badge in a slot: from the grid it replaces what's there; from another slot the two swap. */
  const place = (b: ShownBadge, from: From, to: number) => {
    const next = [...slots];
    const there = next[to];
    if (from === "grid") {
      const was = next.indexOf(b.key);
      if (was >= 0) next[was] = null;
    } else {
      next[from] = there;
    }
    next[to] = b.key;
    // At most four Historikals: they're your lineup.
    if (next.filter((k) => k?.startsWith("i:")).length > LINEUP) {
      setNote("Four Historikals at most: they're your lineup. Swap one out first.");
      return;
    }
    setNote(null);
    setSlots(next);
  };
  const takeOff = (i: number) => setSlots((s) => s.map((k, j) => (j === i ? null : k)));

  const tap = (b: ShownBadge) => {
    setLast(b);
    if (b.hk && !editable) setCard(b);
  };

  // Dragging: a press that moves picks the badge up; let go over a slot to put it there.
  const down = (b: ShownBadge, from: From) => (e: React.PointerEvent) => {
    if (!editable) return;
    press.current = { b, from, x: e.clientX, y: e.clientY, dragging: false };
  };
  const move = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) {
      p.dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (p.dragging) setGhost({ b: p.b, x: e.clientX, y: e.clientY });
  };
  const up = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    setGhost(null);
    if (!p.dragging) {
      // A tap: a filled slot comes off; anything else shows what it is.
      if (p.from !== "grid") takeOff(p.from);
      else tap(p.b);
      return;
    }
    const hit = document.elementsFromPoint(e.clientX, e.clientY).map((el) => (el as HTMLElement).closest?.("[data-slot]") as HTMLElement | null).find(Boolean);
    if (hit) place(p.b, p.from, Number(hit.dataset.slot));
    else if (p.from !== "grid") takeOff(p.from);
  };
  const cancel = () => { press.current = null; setGhost(null); };
  // (The browser's own image drag would steal the gesture.)
  const handlers = (b: ShownBadge, from: From) => ({ onPointerDown: down(b, from), onPointerMove: move, onPointerUp: up, onPointerCancel: cancel, onDragStart: (e: React.DragEvent) => e.preventDefault() });

  return (
    <div role={inline ? undefined : "dialog"} aria-label="All badges" style={inline ? { display: "flex", flexDirection: "column" } : { position: "fixed", inset: 0, zIndex: 80, maxWidth: 480, margin: "0 auto", background: "var(--device)", display: "flex", flexDirection: "column" }}>
      <form action={editable ? setShownBadges : undefined} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <input type="hidden" name="list" value={JSON.stringify(pick)} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: inline ? "4px 0 8px" : "14px 16px 8px" }}>
          <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>{editable ? "EDIT LINEUP" : "BADGES"}</div>
          <span className="spacer" />
          {aside}
          {inline ? null : (
            <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>
              ✕
            </button>
          )}
        </div>

        {editable ? (
          // The display: five slots. Historikals here are your lineup, numbered in the order they sit.
          <div style={{ padding: inline ? "0 0 10px" : "0 16px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="px" style={{ fontSize: 10, color: "#e0398a" }}>YOUR DISPLAY · HISTORIKALS HERE ARE YOUR LINEUP · {lineup.length}/{LINEUP}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between", paddingBottom: 12 }}>
              {slots.map((k, i) => {
                const b = byKey(k);
                const ko = (b?.hk?.hp ?? 1) <= 0;
                const n = k ? lineup.indexOf(k) : -1;
                return (
                  <div key={i} data-slot={i} className="bv-slot" style={{ outline: b ? "none" : undefined }}>
                    {b ? (
                      <button type="button" {...handlers(b, i)} aria-label={`${b.title}: drag to move, tap to take off`} className="bv-item" style={{ filter: ko ? "grayscale(1) brightness(.6)" : undefined }}>
                        <BadgeFace b={b} size={50} />
                      </button>
                    ) : (
                      <span className="px" aria-hidden style={{ fontSize: 12, color: "var(--dim)" }}>+</span>
                    )}
                    {n >= 0 ? <span className="px bv-n" style={{ color: ko ? "#ff5a7a" : "#e0398a" }}>{ko ? "KO" : `LINEUP ${n + 1}`}</span> : null}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.45, color: note ? "#ffb3cf" : "var(--muted)", minHeight: 17 }}>
              {note ?? (lineup.some((k) => (byKey(k)?.hk?.hp ?? 1) <= 0)
                ? "Heal the knocked-out one, or swap it out, before you battle."
                : lineup.length < LINEUP
                  ? `Drag Historikals up to make your lineup: four with hearts left to battle.`
                  : "Drag between slots to rearrange. Drag one out, or tap it, to take it off.")}
            </div>
          </div>
        ) : pick.length ? (
          // Someone else's: their display as they set it, badges and Historikals, the lineup numbered. Tap one to read it.
          <div style={{ padding: inline ? "0 0 10px" : "0 16px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="px" style={{ fontSize: 10, color: "#e0398a" }}>THEIR DISPLAY{lineup.length ? ` · LINEUP ${lineup.length}/${LINEUP}` : ""}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between", paddingBottom: 12 }}>
              {slots.map((k, i) => {
                const b = byKey(k);
                const ko = (b?.hk?.hp ?? 1) <= 0;
                const n = k ? lineup.indexOf(k) : -1;
                return (
                  <div key={i} className="bv-slot" style={{ outline: b ? "none" : undefined }}>
                    {b ? (
                      <button type="button" onClick={() => tap(b)} aria-label={`${b.title}. ${b.line}`} className="bv-item" style={{ filter: ko ? "grayscale(1) brightness(.6)" : undefined }}>
                        <BadgeFace b={b} size={50} />
                      </button>
                    ) : null}
                    {n >= 0 ? <span className="px bv-n" style={{ color: ko ? "#ff5a7a" : "#e0398a" }}>{ko ? "KO" : `LINEUP ${n + 1}`}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Someone else's Historikals stay private beyond the ones in their display: no tab for the rest. */}
        <div className="seg" style={{ margin: inline ? 0 : "0 16px" }}>
          <button type="button" data-on={tab === 0} onClick={() => setTab(0)}>
            EARNED · {earned.length}
          </button>
          {editable ? (
            <button type="button" data-on={tab === 1} onClick={() => setTab(1)}>
              HISTORIKALS · {tradable.length}
            </button>
          ) : null}
        </div>

        <div style={{ minHeight: 56, padding: inline ? "10px 0 4px" : "10px 16px 4px" }} aria-live="polite">
          {last ? (
            <>
              <div className="px" style={{ fontSize: 11, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                {corrupt(last.title, decay)}
                {last.hk ? <button type="button" className="btn btn-sm" onClick={() => setCard(last)} style={{ minHeight: 26, fontSize: 9, padding: "0 8px" }}>VIEW CARD</button> : null}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{corrupt(last.line, decay)}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>
              {editable ? "Drag a badge or Historikal up into your display. Tap one to read it." : "Tap a badge to read what it is and how it was earned."}
            </div>
          )}
        </div>

        <div style={inline ? { padding: "8px 0 16px" } : { flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 16px 16px" }}>
          {list.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 10px" }}>
              {list.map((b, i) => {
                // Already in your display: faded in the grid, while you are choosing.
                const on = !!editable && pick.includes(b.key);
                return (
                  <div key={b.key} style={{ position: "relative", flex: "none", width: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: on ? 0.35 : 1 }}>
                    <button
                      type="button"
                      aria-label={`${b.title}. ${b.line}${editable ? " Drag it up into your display." : ""}`}
                      {...(editable ? handlers(b, "grid") : { onClick: () => tap(b) })}
                      className={`bv-item${editable ? " bv-float" : ""}`}
                      style={{ animationDelay: `${-(i % 7) * 0.45}s`, filter: (b.hk?.hp ?? 1) <= 0 ? "grayscale(1) brightness(.6)" : undefined }}
                    >
                      <BadgeFace b={b} size={63} />
                    </button>
                    <span className="px" style={{ fontSize: 10, lineHeight: 1.35, color: "var(--muted)", textAlign: "center", overflowWrap: "anywhere" }}>{corrupt(b.title, decay)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">NONE YET</div>
          )}
        </div>

        {editable ? (
          <div style={{ padding: inline ? "4px 0 12px" : "8px 16px 20px" }}>
            <button type="submit" className="btn btn-lg btn-purple btn-block">
              SAVE
            </button>
          </div>
        ) : null}
      </form>
      {ghost ? (
        <div aria-hidden style={{ position: "fixed", left: ghost.x, top: ghost.y, transform: "translate(-50%, -60%) scale(1.1)", zIndex: 99, pointerEvents: "none", lineHeight: 0 }}>
          <BadgeFace b={ghost.b} size={63} />
        </div>
      ) : null}
      {card?.hk ? <HistorikalCard hk={card.hk} line={card.line} own={!!editable} lineupPos={lineup.indexOf(card.key)} onClose={() => setCard(null)} /> : null}
    </div>
  );
}
