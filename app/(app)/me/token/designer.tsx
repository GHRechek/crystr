"use client";

import { useEffect, useRef, useState } from "react";
import { setToken } from "@/lib/actions";
import { ArrowIcon } from "@/components/icons";
import {
  BADGE_SIZES,
  ITEMS,
  itemSrc,
  NO_ITEM,
  SHAPES,
  SIZES,
  NORMAL_SIZE,
  SLOTS,
  TOKEN_COLOURS,
  TOKEN_SIZE,
  isFramed,
  itemBounds,
  maxSizeFor,
  moveLayer,
  normalizeToken,
  packToken,
  placeOnTop,
  stackOf,
  tokenSrc,
  type SizeKey,
  type Slot,
  type TokenColour,
  type TokenDesign,
  type Turn,
} from "@/lib/token";

/** Stage pixels per token cell: 8 where there is room (the 32-cell token fills a 256px square),
 *  fewer on a narrow phone, so the stage always fits between its two columns of buttons. */
const MAX_CELL = 8;
const MIN_CELL = 5;
/** Width of a side button, the gap beside it, and the gap between buttons. */
const SIDE = 34;
const GAP = 8;
type Panel = "icons" | "shape" | null;

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
  cell,
  selected,
  onSelect,
  onMove,
}: {
  which: Slot;
  cell: number;
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
        const nx = clampX(s.x + Math.round((e.clientX - s.px) / cell));
        const ny = clampY(s.y + Math.round((e.clientY - s.py) / cell));
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
        left: (TOKEN_SIZE / 2 + x) * cell,
        top: (TOKEN_SIZE / 2 + y) * cell,
        width: it.w * cell,
        height: it.h * cell,
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
        src={itemSrc(slug)}
        alt=""
        width={it.w * cell}
        height={it.h * cell}
        draggable={false}
        style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }}
      />
    </div>
  );
}

/** Design your token: the badge on a stage, with a + on its left and, once an icon is picked,
 *  that icon's tools down its right. The + on the left offers ADD ICON (the icon picker) and SHAPE (the
 *  shape, its size and its colours). The tools are small buttons with no words: take it off, up
 *  and down the layers (the badge shape is a layer, so down far enough is behind it), turn
 *  either way by 45 degrees, flip, bigger and smaller (never below as drawn). The small picture by the save
 *  button is the real thing, drawn by /token. */
export function TokenDesigner({ start, fresh, how = "", canGive = false, onUse }: { start: TokenDesign; fresh: boolean; how?: string; canGive?: boolean; onUse?: (packed: string) => void }) {
  const [d, setD] = useState<TokenDesign>(() => normalizeToken(start));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [menu, setMenu] = useState(false);
  const [cell, setCell] = useState(MAX_CELL);
  const row = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<TokenDesign>) => setD((prev) => normalizeToken({ ...prev, ...patch }));

  // The stage takes what is left between the two side columns, in whole cells.
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const fit = () => {
      const room = el.clientWidth - 2 * SIDE - 2 * GAP;
      setCell(Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(room / TOKEN_SIZE))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stage = TOKEN_SIZE * cell;
  const placed = SLOTS.filter((s) => d[s] !== NO_ITEM);
  const free = SLOTS.find((s) => d[s] === NO_ITEM);
  const sel = selected && d[selected] !== NO_ITEM ? selected : null;
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

  // Bigger in steps, as far as the picture has room for it; smaller back down to as drawn, no further.
  const sizeNow = sel ? d[`${sel}_size`] : NORMAL_SIZE;
  const biggerTo = sel ? SIZES.find((n) => n > sizeNow && n <= maxSizeFor(d[sel], d[`${sel}_turn`])) : undefined;
  const smallerTo = sel && sizeNow > NORMAL_SIZE ? [...SIZES].reverse().find((n) => n < sizeNow && n >= NORMAL_SIZE) : undefined;
  const sizeTo = (n: SizeKey | undefined) => sel && n && set({ [`${sel}_size`]: n } as Partial<TokenDesign>);
  const turnBy = (n: number) => sel && set({ [`${sel}_turn`]: ((d[`${sel}_turn`] + n + 8) % 8) as Turn } as Partial<TokenDesign>);
  const flip = () => sel && set({ [`${sel}_flip`]: !d[`${sel}_flip`] } as Partial<TokenDesign>);
  const remove = () => {
    if (!sel) return;
    set({ [sel]: NO_ITEM } as Partial<TokenDesign>);
    setSelected(null);
  };

  const stageOnly = normalizeToken({ ...d, a: NO_ITEM, b: NO_ITEM, c: NO_ITEM, d: NO_ITEM, e: NO_ITEM });
  const shapeLayer = stackOf(d.order, d.under).indexOf("#");
  const none = d.shape === "none";
  const tool = (label: string, onClick: () => void, glyph: React.ReactNode, opts?: { disabled?: boolean; pressed?: boolean; tone?: string }) => (
    <button
      type="button"
      className={`btn tk-tool${opts?.tone ? ` ${opts.tone}` : ""}${opts?.pressed ? " btn-purple" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={opts?.pressed}
      disabled={opts?.disabled}
      onClick={onClick}
    >
      {glyph}
    </button>
  );

  return (
    <form
      action={onUse ? undefined : setToken}
      onSubmit={onUse ? (e) => { e.preventDefault(); onUse(packToken(d)); } : undefined}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <input type="hidden" name="design" value={JSON.stringify(d)} />

      {/* Written by you: what someone must do to be given it. Shown when they list it under Working On. */}
      {onUse ? null : (
      <label className="field">
        <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>HOW DO PEOPLE EARN IT?</span>
        <input
          name="how"
          className="input"
          defaultValue={how}
          maxLength={140}
          placeholder="Make me a good cup of tea, or tell me a better ghost story"
          style={{ fontSize: 12.5 }}
        />
      </label>
      )}


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
        {canGive && !onUse ? (
          <a href="#give" className="btn btn-sm btn-purple" style={{ minHeight: 40, flex: "none", display: "inline-flex", alignItems: "center", textAlign: "center" }}>
            GIVE IT TO SOMEONE
          </a>
        ) : null}
      </div>

      {/* + on the left, the stage, and the picked icon's tools on the right (their column is
          always there, so the stage does not move when one is picked). */}
      <div ref={row} style={{ display: "flex", gap: GAP, alignItems: "flex-start", justifyContent: "center" }}>
        <div className="tk-side" style={{ width: SIDE, position: "relative" }}>
          {tool("Add", () => setMenu((m) => !m), "+", { pressed: menu })}
          {menu ? (
            <div className="tk-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="btn btn-sm"
                disabled={!free}
                onClick={() => {
                  setMenu(false);
                  setPanel("icons");
                }}
              >
                ADD ICON {placed.length}/{SLOTS.length}
              </button>
              <button
                type="button"
                role="menuitem"
                className="btn btn-sm"
                onClick={() => {
                  setMenu(false);
                  setPanel("shape");
                }}
              >
                SHAPE
              </button>
            </div>
          ) : null}
        </div>

        {/* The stage: the badge, and the icons on it, on the app's own background. Tapping the
            badge itself clears the pick. */}
        <div
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setMenu(false);
            }
          }}
          style={{ position: "relative", width: stage, height: stage, flex: "none", touchAction: "none", overflow: "hidden", isolation: "isolate" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tokenSrc(stageOnly)}
            alt=""
            width={stage}
            height={stage}
            draggable={false}
            style={{ position: "absolute", inset: 0, imageRendering: "pixelated", pointerEvents: "none", zIndex: shapeLayer }}
          />
          {SLOTS.map((k) => (
            <Sticker key={k} which={k} d={d} cell={cell} selected={sel === k} onSelect={setSelected} onMove={(s, x, y) => set({ [`${s}_x`]: x, [`${s}_y`]: y } as Partial<TokenDesign>)} />
          ))}
        </div>

        <div className="tk-side" style={{ width: SIDE }} role="toolbar" aria-label="Icon tools">
          {sel ? (
            <>
              {tool("Take it off", remove, "✕", { tone: "tk-danger" })}
              {tool("Up a layer", () => up && set(up), <ArrowIcon dir="up" />, { disabled: !up })}
              {tool("Down a layer", () => down && set(down), <ArrowIcon dir="down" />, { disabled: !down })}
              {tool("Turn right 45 degrees", () => turnBy(1), "↻")}
              {tool("Turn left 45 degrees", () => turnBy(-1), "↺")}
              {tool("Flip", flip, "⇄", { pressed: d[`${sel}_flip`] })}
              {tool("Bigger", () => sizeTo(biggerTo), "+", { disabled: !biggerTo })}
              {tool("Smaller, down to as drawn", () => sizeTo(smallerTo), "−", { disabled: !smallerTo })}
            </>
          ) : null}
        </div>
      </div>

      {placed.length === 0 ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", textAlign: "center" }}>
          Tap + to add an icon, then drag it where you want it.
        </div>
      ) : null}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        {onUse ? "USE THIS PICTURE" : "KEEP THIS TOKEN"}
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
                <img src={itemSrc(it.slug)} alt="" loading="lazy" width={it.w * 2} height={it.h * 2} style={{ imageRendering: "pixelated" }} />
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}

      {panel === "shape" ? (
        <Sheet title="SHAPE AND COLOUR" onClose={() => setPanel(null)}>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            SHAPE
          </div>
          <div role="radiogroup" aria-label="Badge shape" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
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
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  {s.key === "none" ? (
                    <span aria-hidden style={{ width: "100%", maxWidth: 64, aspectRatio: "1", display: "grid", placeItems: "center", fontSize: 22, border: "1px dashed var(--edge)" }}>
                      ∅
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tokenSrc(preview)} alt="" width={64} height={64} style={{ imageRendering: "pixelated", width: "100%", height: "auto", maxWidth: 64 }} />
                  )}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {none ? null : (
            <>
              <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                SIZE
              </div>
              <div role="radiogroup" aria-label="Badge size" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {BADGE_SIZES.map((n) => {
                  const on = d.badge_size === n;
                  return (
                    <button key={n} type="button" role="radio" aria-checked={on} onClick={() => set({ badge_size: n })} className={`btn btn-sm${on ? " btn-purple" : ""}`} style={{ minHeight: 40 }}>
                      {BADGE_SIZE_LABELS[n].toUpperCase()} · {n}%
                    </button>
                  );
                })}
              </div>
              <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                COLOUR
              </div>
              <Swatches value={d.fill} onPick={(fill) => set({ fill })} name="Badge colour" />
              {isFramed(d.shape) ? (
                <>
                  <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    FRAME
                  </div>
                  <Swatches value={d.rim} onPick={(rim) => set({ rim })} name="Frame colour" />
                </>
              ) : null}
            </>
          )}
        </Sheet>
      ) : null}
    </form>
  );
}
