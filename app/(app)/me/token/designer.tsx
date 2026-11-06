"use client";

import { useRef, useState } from "react";
import { setToken } from "@/lib/actions";
import { ArrowIcon } from "@/components/icons";
import {
  BADGE_SIZES,
  ITEMS,
  NO_ITEM,
  SHAPES,
  SIZES,
  SLOTS,
  TOKEN_COLOURS,
  TOKEN_SIZE,
  colourHex,
  isFramed,
  itemBounds,
  moveLayer,
  normalizeToken,
  placeOnTop,
  stackOf,
  tokenSrc,
  type SizeKey,
  type Slot,
  type TokenColour,
  type TokenDesign,
  type Turn,
} from "@/lib/token";

/** Stage pixels per token cell: the 32-cell token fills a 256px square. */
const CELL = 8;
const STAGE = TOKEN_SIZE * CELL;
type Panel = "icons" | "shape" | "fill" | "rim" | null;

const BADGE_SIZE_LABELS: Record<number, string> = { 50: "Small", 75: "Mid", 100: "Large" };

/** A panel that slides up over the page, like a sticker drawer. Tapping outside closes it. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-label={title} style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", flexDirection: "column" }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ flex: 1, border: 0, background: "rgba(5,5,12,.6)", cursor: "default" }} />
      <div
        style={{
          maxHeight: "72%",
          overflowY: "auto",
          background: "var(--device)",
          boxShadow: "0 -1px 0 var(--edge), 0 -12px 36px rgba(0,0,0,.5)",
          padding: "12px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
            {title}
          </div>
          <div className="spacer" />
          <button type="button" className="btn btn-sm" onClick={onClose} style={{ minHeight: 40, padding: "0 9px" }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Swatches({ value, onPick, name }: { value: TokenColour; onPick: (k: TokenColour) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {TOKEN_COLOURS.map((s) => {
        const on = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={s.label}
            title={s.label}
            onClick={() => onPick(s.key)}
            style={{
              width: 36,
              height: 36,
              padding: 0,
              cursor: "pointer",
              background: s.hex,
              border: 0,
              borderRadius: "var(--px-r)",
              boxShadow: on ? "0 0 0 2px var(--device), 0 0 0 4px var(--text)" : "0 0 0 1px var(--edge)",
              color: s.key === "bone" || s.key === "gold" ? "#161826" : "#fff",
              fontSize: 14,
            }}
          >
            {on ? "✓" : ""}
          </button>
        );
      })}
    </div>
  );
}

/** One item on the stage: drag it to place it, tap it to pick it. Arrow keys nudge it. */
function Sticker({
  which,
  d,
  selected,
  onSelect,
  onMove,
}: {
  which: Slot;
  d: TokenDesign;
  selected: boolean;
  onSelect: (s: Slot) => void;
  onMove: (s: Slot, x: number, y: number) => void;
}) {
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const slug = d[which];
  const it = ITEMS.find((i) => i.slug === slug);
  if (slug === NO_ITEM || !it) return null;
  const x = d[`${which}_x`];
  const y = d[`${which}_y`];
  const flip = d[`${which}_flip`];
  const turn = d[`${which}_turn`];
  const size = d[`${which}_size`];
  // It can go to the edge of the picture and no further.
  const bounds = itemBounds(slug, turn, size);
  const clampX = (n: number) => Math.max(-bounds.x, Math.min(bounds.x, n));
  const clampY = (n: number) => Math.max(-bounds.y, Math.min(bounds.y, n));

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${it.label}${selected ? ", picked" : ""}. Drag to move.`}
      aria-pressed={selected}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { px: e.clientX, py: e.clientY, x, y };
        onSelect(which);
      }}
      onPointerMove={(e) => {
        const s = drag.current;
        if (!s) return;
        const nx = clampX(s.x + Math.round((e.clientX - s.px) / CELL));
        const ny = clampY(s.y + Math.round((e.clientY - s.py) / CELL));
        if (nx !== x || ny !== y) onMove(which, nx, ny);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!step) return;
        e.preventDefault();
        onSelect(which);
        onMove(which, clampX(x + step[0]), clampY(y + step[1]));
      }}
      style={{
        position: "absolute",
        left: (TOKEN_SIZE / 2 + x) * CELL,
        top: (TOKEN_SIZE / 2 + y) * CELL,
        width: it.w * CELL,
        height: it.h * CELL,
        // Flip first, then turn, then shrink, about the middle; the server draws it the same way.
        transform: `translate(-50%, -50%) rotate(${turn * 45}deg) scaleX(${flip ? -1 : 1}) scale(${size / 100})`,
        touchAction: "none",
        cursor: "grab",
        outline: selected ? "2px dashed var(--pur-bright)" : "none",
        outlineOffset: 4,
        // One stack of layers, the badge shape among them (layer 0 of the stage is the shape's
        // own picture, given the shape's place in the stack).
        zIndex: stackOf(d.order, d.under).indexOf(which),
        userSelect: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/items/${slug}.png`}
        alt=""
        width={it.w * CELL}
        height={it.h * CELL}
        draggable={false}
        style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }}
      />
    </div>
  );
}

/** Design your token like a post: the badge on a stage, icons added from a drawer and
 *  dragged into place. Everything else is one row of small buttons under the stage, with no
 *  words on them: the shape, its two colours, add an icon, the picked icon (with an x to take
 *  it off), turn and flip, bigger and smaller, and up and down the layers (the badge itself is
 *  a layer, so down far enough is behind it). The small picture by the save button is the real
 *  thing, drawn by /token. */
export function TokenDesigner({ start, fresh }: { start: TokenDesign; fresh: boolean }) {
  const [d, setD] = useState<TokenDesign>(() => normalizeToken(start));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const set = (patch: Partial<TokenDesign>) => setD((prev) => normalizeToken({ ...prev, ...patch }));

  const placed = SLOTS.filter((s) => d[s] !== NO_ITEM);
  const free = SLOTS.find((s) => d[s] === NO_ITEM);
  const sel = selected && d[selected] !== NO_ITEM ? selected : null;
  const selItem = sel ? ITEMS.find((i) => i.slug === d[sel]) : null;
  const up = sel ? moveLayer(d, sel, 1) : null;
  const down = sel ? moveLayer(d, sel, -1) : null;

  function addIcon(slug: string) {
    if (!free) return;
    set({
      [free]: slug,
      [`${free}_x`]: 0,
      [`${free}_y`]: 0,
      [`${free}_flip`]: false,
      [`${free}_turn`]: 0,
      [`${free}_size`]: 100,
      ...placeOnTop(d, free),
    } as Partial<TokenDesign>);
    setSelected(free);
    setPanel(null);
  }

  function sizeBy(step: number) {
    if (!sel) return;
    const at = SIZES.indexOf(d[`${sel}_size`]);
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, at + step))] as SizeKey;
    set({ [`${sel}_size`]: next } as Partial<TokenDesign>);
  }

  const turnRight = () => sel && set({ [`${sel}_turn`]: ((d[`${sel}_turn`] + 1) % 8) as Turn } as Partial<TokenDesign>);
  const flip = () => sel && set({ [`${sel}_flip`]: !d[`${sel}_flip`] } as Partial<TokenDesign>);
  const remove = () => {
    if (!sel) return;
    set({ [sel]: NO_ITEM } as Partial<TokenDesign>);
    setSelected(null);
  };

  const stageOnly = normalizeToken({ ...d, a: NO_ITEM, b: NO_ITEM, c: NO_ITEM, d: NO_ITEM, e: NO_ITEM });
  const shapeLayer = stackOf(d.order, d.under).indexOf("#");
  const none = d.shape === "none";

  return (
    <form action={setToken} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="design" value={JSON.stringify(d)} />

      {/* The real render and the save, pinned while the stage is worked on. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 0 10px",
          margin: "0 -16px",
          paddingInline: 16,
          background: "var(--device)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tokenSrc(d)} alt="Your token, as it will be" width={64} height={64} style={{ imageRendering: "pixelated", flex: "none" }} />
        <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
          {fresh ? "Nobody has seen this yet." : "Changing it changes what you give next; tokens already given keep their look."}
        </div>
        <button type="submit" className="btn btn-sm btn-purple" style={{ minHeight: 40, flex: "none" }}>
          KEEP IT
        </button>
      </div>

      {/* The stage: the badge, and the icons on it. Tapping the badge itself clears the pick. */}
      <div
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
        style={{
          position: "relative",
          width: STAGE,
          height: STAGE,
          maxWidth: "100%",
          margin: "0 auto",
          borderRadius: "var(--px-r)",
          background: "var(--inset)",
          boxShadow: "0 0 0 1px var(--edge)",
          touchAction: "none",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tokenSrc(stageOnly)}
          alt=""
          width={STAGE}
          height={STAGE}
          draggable={false}
          style={{ position: "absolute", inset: 0, imageRendering: "pixelated", pointerEvents: "none", zIndex: shapeLayer }}
        />
        {SLOTS.map((k) => (
          <Sticker key={k} which={k} d={d} selected={sel === k} onSelect={setSelected} onMove={(s, x, y) => set({ [`${s}_x`]: x, [`${s}_y`]: y } as Partial<TokenDesign>)} />
        ))}
      </div>

      {/* Left to right: the shape, its two colours (badge over frame), add an icon, the picked
          icon, turn over flip, bigger over smaller, up over down the layers. */}
      <div className="tk-bar" role="toolbar" aria-label="Token tools">
        <button type="button" className="btn tk-big" style={{ gridColumn: 1, gridRow: "1 / 3" }} onClick={() => setPanel("shape")}>
          SHAPE
        </button>
        <button
          type="button"
          className="btn tk-sm tk-swatch"
          aria-label="Badge colour"
          title="Badge colour"
          disabled={none}
          onClick={() => setPanel("fill")}
          style={{ gridColumn: 2, gridRow: 1, background: none ? "transparent" : colourHex(d.fill) }}
        />
        <button
          type="button"
          className="btn tk-sm tk-swatch"
          aria-label="Frame colour"
          title="Frame colour"
          disabled={!isFramed(d.shape)}
          onClick={() => setPanel("rim")}
          style={{ gridColumn: 2, gridRow: 2, background: isFramed(d.shape) ? colourHex(d.rim) : "transparent" }}
        />
        <button type="button" className="btn btn-purple tk-big" style={{ gridColumn: 3, gridRow: "1 / 3" }} onClick={() => setPanel("icons")} disabled={!free}>
          ADD ICON {placed.length}/{SLOTS.length}
        </button>

        <div className="tk-cur" style={{ gridColumn: 4, gridRow: "1 / 3" }}>
          {sel && selItem ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/badges/items/${selItem.slug}.png`}
                alt={selItem.label}
                width={selItem.w * 2}
                height={selItem.h * 2}
                style={{ imageRendering: "pixelated", maxWidth: "76%", height: "auto" }}
              />
              <button type="button" className="tk-x" aria-label={`Take the ${selItem.label} off`} title="Take it off" onClick={remove}>
                ✕
              </button>
            </>
          ) : null}
        </div>

        <button type="button" className="btn tk-sm" aria-label="Turn right 45 degrees" title="Turn 45°" disabled={!sel} onClick={turnRight} style={{ gridColumn: 5, gridRow: 1 }}>
          ↻
        </button>
        <button type="button" className={`btn tk-sm${sel && d[`${sel}_flip`] ? " btn-purple" : ""}`} aria-label="Flip" title="Flip" aria-pressed={!!sel && d[`${sel}_flip`]} disabled={!sel} onClick={flip} style={{ gridColumn: 5, gridRow: 2 }}>
          ⇄
        </button>
        <button type="button" className="btn tk-sm" aria-label="Bigger" title="Bigger" disabled={!sel || d[`${sel}_size`] === 100} onClick={() => sizeBy(1)} style={{ gridColumn: 6, gridRow: 1 }}>
          +
        </button>
        <button type="button" className="btn tk-sm" aria-label="Smaller" title="Smaller" disabled={!sel || d[`${sel}_size`] === SIZES[0]} onClick={() => sizeBy(-1)} style={{ gridColumn: 6, gridRow: 2 }}>
          −
        </button>
        <button type="button" className="btn tk-sm" aria-label="Up a layer" title="Up a layer" disabled={!up} onClick={() => up && set(up)} style={{ gridColumn: 7, gridRow: 1 }}>
          <ArrowIcon dir="up" />
        </button>
        <button type="button" className="btn tk-sm" aria-label="Down a layer" title="Down a layer" disabled={!down} onClick={() => down && set(down)} style={{ gridColumn: 7, gridRow: 2 }}>
          <ArrowIcon dir="down" />
        </button>
      </div>

      {placed.length === 0 ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", textAlign: "center" }}>
          Add an icon, then drag it where you want it.
        </div>
      ) : null}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        KEEP THIS TOKEN
      </button>

      {panel === "icons" ? (
        <Sheet title={`ADD AN ICON · ${placed.length}/${SLOTS.length}`} onClose={() => setPanel(null)}>
          <div role="listbox" aria-label="Icons" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {ITEMS.map((it) => (
              <button
                key={it.slug}
                type="button"
                role="option"
                aria-selected={false}
                aria-label={it.label}
                title={it.label}
                onClick={() => addIcon(it.slug)}
                style={{
                  minHeight: 48,
                  padding: 0,
                  cursor: "pointer",
                  background: "var(--surface)",
                  border: "1px solid var(--edge)",
                  borderRadius: "var(--px-r)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/badges/items/${it.slug}.png`} alt="" width={it.w * 2} height={it.h * 2} style={{ imageRendering: "pixelated" }} />
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}

      {panel === "shape" ? (
        <Sheet title="BADGE SHAPE" onClose={() => setPanel(null)}>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            SIZE
          </div>
          <div role="radiogroup" aria-label="Badge size" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BADGE_SIZES.map((n) => {
              const on = d.badge_size === n;
              return (
                <button key={n} type="button" role="radio" aria-checked={on} disabled={none} onClick={() => set({ badge_size: n })} className={`btn btn-sm${on ? " btn-purple" : ""}`} style={{ minHeight: 40 }}>
                  {BADGE_SIZE_LABELS[n].toUpperCase()} · {n}%
                </button>
              );
            })}
          </div>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            SHAPE
          </div>
          <div role="radiogroup" aria-label="Badge shape" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {SHAPES.map((s) => {
              const on = s.key === d.shape;
              const preview = normalizeToken({ ...stageOnly, shape: s.key });
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => set({ shape: s.key })}
                  style={{
                    padding: 4,
                    cursor: "pointer",
                    background: on ? "rgba(145,132,217,.18)" : "var(--surface)",
                    border: `1px solid ${on ? "var(--pur)" : "var(--edge)"}`,
                    borderRadius: "var(--px-r)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    color: on ? "var(--text)" : "var(--muted)",
                    fontSize: 9,
                    lineHeight: 1.2,
                    textAlign: "center",
                  }}
                >
                  {s.key === "none" ? (
                    <span aria-hidden style={{ width: 64, height: 64, display: "grid", placeItems: "center", fontSize: 22, border: "1px dashed var(--edge)" }}>
                      ∅
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tokenSrc(preview)} alt="" width={64} height={64} style={{ imageRendering: "pixelated" }} />
                  )}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      ) : null}

      {panel === "fill" || panel === "rim" ? (
        <Sheet title={panel === "fill" ? "BADGE COLOUR" : "FRAME COLOUR"} onClose={() => setPanel(null)}>
          <Swatches
            value={panel === "fill" ? d.fill : d.rim}
            onPick={(k) => set(panel === "fill" ? { fill: k } : { rim: k })}
            name={panel === "fill" ? "Badge colour" : "Frame colour"}
          />
        </Sheet>
      ) : null}
    </form>
  );
}
