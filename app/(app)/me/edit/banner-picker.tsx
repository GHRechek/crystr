"use client";

import { useState } from "react";
import { setBanner } from "@/lib/actions";
import { PATTERNS, SWATCHES, bannerStyle, type Banner, type PatternKey, type SwatchKey } from "@/lib/banner";

function Swatches({ value, onPick, name }: { value: SwatchKey; onPick: (k: SwatchKey) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {SWATCHES.map((s) => {
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
              width: 40,
              height: 40,
              padding: 0,
              cursor: "pointer",
              background: s.hex,
              border: 0,
              borderRadius: "var(--px-r)",
              boxShadow: on ? "0 0 0 2px var(--device), 0 0 0 4px var(--text)" : "0 0 0 1px var(--edge)",
              color: s.key === "mist" || s.key.endsWith("light") ? "#161826" : "#fff",
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

/** Choose a pattern and two colours for your profile banner, with the result shown live. */
export function BannerPicker({ current }: { current: Banner }) {
  const [pattern, setPattern] = useState<PatternKey>(current.pattern);
  const [a, setA] = useState<SwatchKey>(current.a);
  const [b, setB] = useState<SwatchKey>(current.b);

  const label = { fontSize: 11, color: "var(--muted)", letterSpacing: ".05em" } as const;

  return (
    <form action={setBanner} className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
        YOUR BANNER
      </div>

      <div
        aria-label="Preview of your banner"
        role="img"
        style={{ height: 84, borderRadius: "var(--px-r)", boxShadow: "0 0 0 1px var(--edge)", ...bannerStyle({ pattern, a, b }) }}
      />

      <input type="hidden" name="pattern" value={pattern} />
      <input type="hidden" name="a" value={a} />
      <input type="hidden" name="b" value={b} />

      <div>
        <div className="px" style={{ ...label, marginBottom: 6 }}>
          PATTERN
        </div>
        <div role="radiogroup" aria-label="Pattern" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {PATTERNS.map((p) => {
            const on = p.key === pattern;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPattern(p.key)}
                style={{
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  alignItems: "stretch",
                  color: on ? "var(--text)" : "var(--muted)",
                  fontSize: 11,
                  lineHeight: 1.2,
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    height: 44,
                    borderRadius: "var(--px-r)",
                    boxShadow: on ? "0 0 0 2px var(--device), 0 0 0 4px var(--text)" : "0 0 0 1px var(--edge)",
                    ...bannerStyle({ pattern: p.key, a, b }),
                  }}
                />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="px" style={{ ...label, marginBottom: 6 }}>
          FIRST COLOUR
        </div>
        <Swatches value={a} onPick={setA} name="First colour" />
      </div>

      <div>
        <div className="px" style={{ ...label, marginBottom: 6 }}>
          SECOND COLOUR
        </div>
        <Swatches value={b} onPick={setB} name="Second colour" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-purple" style={{ flex: 1 }}>
          SAVE BANNER
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setA(b);
            setB(a);
          }}
        >
          ⇄ SWAP
        </button>
        <button type="submit" name="reset" value="1" className="btn">
          BACK TO THE ORIGINAL
        </button>
      </div>
    </form>
  );
}
