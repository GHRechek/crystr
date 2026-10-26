"use client";

import { useMemo, useState } from "react";
import { setToken } from "@/lib/actions";
import {
  ITEMS,
  NO_ITEM,
  SHAPES,
  SIZES,
  TOKEN_COLOURS,
  isFramed,
  normalizeToken,
  tokenSrc,
  type SizeKey,
  type TokenColour,
  type TokenDesign,
} from "@/lib/token";

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

/** A shape, drawn as a token of its own in the chosen colours, so the choice is seen. */
function ShapeChoices({ design, onPick }: { design: TokenDesign; onPick: (k: TokenDesign["shape"]) => void }) {
  return (
    <div role="radiogroup" aria-label="Badge shape" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
      {SHAPES.map((s) => {
        const on = s.key === design.shape;
        const preview = normalizeToken({ ...design, shape: s.key, a: NO_ITEM, b: NO_ITEM });
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
  );
}

/** One of the two items: which, flipped or not, turned how far, how big, on top. */
function ItemControl({
  which,
  design,
  set,
}: {
  which: "a" | "b";
  design: TokenDesign;
  set: (patch: Partial<TokenDesign>) => void;
}) {
  const slug = design[which];
  const flip = design[`${which}_flip`];
  const rot = design[`${which}_rot`];
  const size = design[`${which}_size`];
  const onTop = design.top === which;
  const at = SIZES.indexOf(size);
  const sizeBy = (step: number) => {
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, at + step))] as SizeKey;
    set({ [`${which}_size`]: next } as Partial<TokenDesign>);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn btn-sm${flip ? " btn-purple" : ""}`}
          aria-pressed={flip}
          onClick={() => set({ [`${which}_flip`]: !flip } as Partial<TokenDesign>)}
          style={{ minHeight: 40 }}
        >
          ⇄ FLIP
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => set({ [`${which}_rot`]: ((rot + 1) % 4) as 0 | 1 | 2 | 3 } as Partial<TokenDesign>)}
          style={{ minHeight: 40 }}
        >
          ↻ TURN · {rot * 90}°
        </button>
        <span role="group" aria-label="Size" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="btn btn-sm" onClick={() => sizeBy(-1)} disabled={at <= 0} aria-label="Smaller" style={{ minHeight: 40, minWidth: 40 }}>
            −
          </button>
          <span className="px" style={{ fontSize: 11, minWidth: 44, textAlign: "center" }}>
            {size}%
          </span>
          <button type="button" className="btn btn-sm" onClick={() => sizeBy(1)} disabled={at >= SIZES.length - 1} aria-label="Bigger" style={{ minHeight: 40, minWidth: 40 }}>
            +
          </button>
        </span>
        <button
          type="button"
          className={`btn btn-sm${onTop ? " btn-purple" : ""}`}
          aria-pressed={onTop}
          onClick={() => set({ top: which })}
          style={{ minHeight: 40 }}
        >
          {onTop ? "ON TOP" : "PUT ON TOP"}
        </button>
      </div>
      <div role="radiogroup" aria-label={`Item ${which.toUpperCase()}`} style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
        <button
          type="button"
          role="radio"
          aria-checked={slug === NO_ITEM}
          onClick={() => set({ [which]: NO_ITEM } as Partial<TokenDesign>)}
          className="btn btn-sm"
          style={{ minHeight: 44, padding: 0, fontSize: 10, borderColor: slug === NO_ITEM ? "var(--pur)" : undefined }}
        >
          NONE
        </button>
        {ITEMS.map((it) => {
          const on = it.slug === slug;
          return (
            <button
              key={it.slug}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={it.label}
              title={it.label}
              onClick={() => set({ [which]: it.slug } as Partial<TokenDesign>)}
              style={{
                minHeight: 44,
                padding: 0,
                cursor: "pointer",
                background: on ? "rgba(145,132,217,.18)" : "var(--surface)",
                border: `1px solid ${on ? "var(--pur)" : "var(--edge)"}`,
                borderRadius: "var(--px-r)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/badges/items/${it.slug}.png`} alt="" width={32} height={32} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Design your token from parts: a shape in your colours, then two items. The picture at
 *  the top is the real thing, drawn by /token as you go. */
export function TokenDesigner({ start, fresh }: { start: TokenDesign; fresh: boolean }) {
  const [d, setD] = useState<TokenDesign>(() => normalizeToken(start));
  const set = (patch: Partial<TokenDesign>) => setD((prev) => normalizeToken({ ...prev, ...patch }));
  const src = useMemo(() => tokenSrc(d), [d]);
  const label = { fontSize: 11, color: "var(--muted)", letterSpacing: ".05em", marginBottom: 6 } as const;

  return (
    <form action={setToken} className="pad" style={{ gap: 14, padding: 0 }}>
      <input type="hidden" name="design" value={JSON.stringify(d)} />

      {/* Sticks to the top so the token stays in view while you work down the options. */}
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
        <img src={src} alt="Your token" width={128} height={128} style={{ imageRendering: "pixelated", flex: "none" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
            {fresh ? "Nobody has seen this yet." : "Changing it changes what you give next; tokens already given keep their look."}
          </div>
          <button type="submit" className="btn btn-sm btn-purple">
            KEEP THIS TOKEN
          </button>
        </div>
      </div>

      <div>
        <div className="px" style={label}>
          1 · BADGE SHAPE
        </div>
        <ShapeChoices design={d} onPick={(shape) => set({ shape })} />
      </div>

      <div>
        <div className="px" style={label}>
          BADGE COLOUR
        </div>
        <Swatches value={d.fill} onPick={(fill) => set({ fill })} name="Badge colour" />
      </div>

      {isFramed(d.shape) ? (
        <div>
          <div className="px" style={label}>
            FRAME COLOUR
          </div>
          <Swatches value={d.rim} onPick={(rim) => set({ rim })} name="Frame colour" />
        </div>
      ) : null}

      <div>
        <div className="px" style={label}>
          2 · FIRST ITEM
        </div>
        <ItemControl which="a" design={d} set={set} />
      </div>

      <div>
        <div className="px" style={label}>
          3 · SECOND ITEM
        </div>
        <ItemControl which="b" design={d} set={set} />
      </div>

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        KEEP THIS TOKEN
      </button>
    </form>
  );
}
