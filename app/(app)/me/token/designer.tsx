"use client";

import { useRef, useState } from "react";
import { setToken } from "@/lib/actions";
import {
  BADGE_SIZES,
  ITEMS,
  NO_ITEM,
  SHAPES,
  SIZES,
  TOKEN_COLOURS,
  TOKEN_SIZE,
  isFramed,
  itemBounds,
  normalizeToken,
  tokenSrc,
  type SizeKey,
  type TokenColour,
  type TokenDesign,
} from "@/lib/token";

/** Stage pixels per token cell: the 32-cell token fills a 256px square. */
const CELL = 8;
const STAGE = TOKEN_SIZE * CELL;
type Slot = "a" | "b";
type Panel = "icons" | "shape" | "colours" | null;

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
  const rot = d[`${which}_rot`];
  const size = d[`${which}_size`];
  // It can go to the edge of the picture and no further.
  const bounds = itemBounds(slug, rot, size);
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
        transform: `translate(-50%, -50%) rotate(${rot * 90}deg) scaleX(${flip ? -1 : 1}) scale(${size / 100})`,
        touchAction: "none",
        cursor: "grab",
        outline: selected ? "2px dashed var(--pur-bright)" : "none",
        outlineOffset: 4,
        zIndex: d.top === which ? 2 : 1,
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
 *  dragged into place. Pick an icon to flip it, turn it, shrink it, put it on top or take
 *  it off. The small picture by the save button is the real thing, drawn by /token. */
export function TokenDesigner({ start, fresh }: { start: TokenDesign; fresh: boolean }) {
  const [d, setD] = useState<TokenDesign>(() => normalizeToken(start));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const set = (patch: Partial<TokenDesign>) => setD((prev) => normalizeToken({ ...prev, ...patch }));

  const placed = (["a", "b"] as const).filter((s) => d[s] !== NO_ITEM);
  const free = (["a", "b"] as const).find((s) => d[s] === NO_ITEM);
  const sel = selected && d[selected] !== NO_ITEM ? selected : null;
  const selItem = sel ? ITEMS.find((i) => i.slug === d[sel]) : null;

  function addIcon(slug: string) {
    if (!free) return;
    set({ [free]: slug, [`${free}_x`]: 0, [`${free}_y`]: 0, [`${free}_flip`]: false, [`${free}_rot`]: 0, [`${free}_size`]: 100, top: free } as Partial<TokenDesign>);
    setSelected(free);
    setPanel(null);
  }

  function sizeBy(step: number) {
    if (!sel) return;
    const at = SIZES.indexOf(d[`${sel}_size`]);
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, at + step))] as SizeKey;
    set({ [`${sel}_size`]: next } as Partial<TokenDesign>);
  }

  const toolbar = { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" } as const;
  const stageOnly = normalizeToken({ ...d, a: NO_ITEM, b: NO_ITEM });

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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tokenSrc(stageOnly)}
          alt=""
          width={STAGE}
          height={STAGE}
          draggable={false}
          style={{ position: "absolute", inset: 0, imageRendering: "pixelated", pointerEvents: "none" }}
        />
        <Sticker which="a" d={d} selected={sel === "a"} onSelect={setSelected} onMove={(s, x, y) => set({ [`${s}_x`]: x, [`${s}_y`]: y } as Partial<TokenDesign>)} />
        <Sticker which="b" d={d} selected={sel === "b"} onSelect={setSelected} onMove={(s, x, y) => set({ [`${s}_x`]: x, [`${s}_y`]: y } as Partial<TokenDesign>)} />
      </div>

      {sel && selItem ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)", textAlign: "center" }}>
            {selItem.label.toUpperCase()} · DRAG IT TO PLACE IT
          </div>
          <div style={toolbar}>
            <button type="button" className={`btn btn-sm${d[`${sel}_flip`] ? " btn-purple" : ""}`} aria-pressed={d[`${sel}_flip`]} onClick={() => set({ [`${sel}_flip`]: !d[`${sel}_flip`] } as Partial<TokenDesign>)} style={{ minHeight: 40 }}>
              ⇄ FLIP
            </button>
            <button type="button" className="btn btn-sm" onClick={() => set({ [`${sel}_rot`]: ((d[`${sel}_rot`] + 1) % 4) as 0 | 1 | 2 | 3 } as Partial<TokenDesign>)} style={{ minHeight: 40 }}>
              ↻ TURN
            </button>
            <span role="group" aria-label="Size" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button type="button" className="btn btn-sm" onClick={() => sizeBy(-1)} disabled={d[`${sel}_size`] === SIZES[0]} aria-label="Smaller" style={{ minHeight: 40, minWidth: 40 }}>
                −
              </button>
              <span className="px" style={{ fontSize: 11, minWidth: 44, textAlign: "center" }}>
                {d[`${sel}_size`]}%
              </span>
              <button type="button" className="btn btn-sm" onClick={() => sizeBy(1)} disabled={d[`${sel}_size`] === 100} aria-label="Bigger, up to as drawn" style={{ minHeight: 40, minWidth: 40 }}>
                +
              </button>
            </span>
            <button type="button" className={`btn btn-sm${d.top === sel ? " btn-purple" : ""}`} aria-pressed={d.top === sel} onClick={() => set({ top: sel })} style={{ minHeight: 40 }}>
              {d.top === sel ? "ON TOP" : "PUT ON TOP"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-mag"
              onClick={() => {
                set({ [sel]: NO_ITEM } as Partial<TokenDesign>);
                setSelected(null);
              }}
              style={{ minHeight: 40 }}
            >
              ✕ REMOVE
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", textAlign: "center" }}>
          {placed.length ? "Tap an icon to flip, turn or shrink it. Drag it to place it." : "Add an icon or two, then drag them where you want them."}
        </div>
      )}

      <div style={toolbar}>
        <button type="button" className="btn btn-sm btn-purple" onClick={() => setPanel("icons")} disabled={!free} style={{ minHeight: 40 }}>
          ✚ ADD ICON {placed.length}/2
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setPanel("shape")} style={{ minHeight: 40 }}>
          ◈ SHAPE
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setPanel("colours")} style={{ minHeight: 40 }}>
          ● COLOURS
        </button>
      </div>

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        KEEP THIS TOKEN
      </button>

      {panel === "icons" ? (
        <Sheet title={`ADD AN ICON · ${placed.length}/2`} onClose={() => setPanel(null)}>
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
                <button key={n} type="button" role="radio" aria-checked={on} onClick={() => set({ badge_size: n })} className={`btn btn-sm${on ? " btn-purple" : ""}`} style={{ minHeight: 40 }}>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tokenSrc(preview)} alt="" width={64} height={64} style={{ imageRendering: "pixelated" }} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      ) : null}

      {panel === "colours" ? (
        <Sheet title="COLOURS" onClose={() => setPanel(null)}>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            BADGE
          </div>
          <Swatches value={d.fill} onPick={(fill) => set({ fill })} name="Badge colour" />
          {isFramed(d.shape) ? (
            <>
              <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                FRAME
              </div>
              <Swatches value={d.rim} onPick={(rim) => set({ rim })} name="Frame colour" />
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>A framed shape also takes a frame colour.</div>
          )}
        </Sheet>
      ) : null}
    </form>
  );
}
