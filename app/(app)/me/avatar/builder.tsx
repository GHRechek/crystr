"use client";

import Link from "next/link";
import { useState } from "react";
import { saveAvatar } from "@/lib/actions";
import {
  AvatarSvg,
  BG,
  EYE,
  HAIR,
  OPTION_COUNTS,
  SKIN,
  avatarFromId,
  type AvatarConfig,
} from "@/lib/avatar";

const SHAPES: { key: keyof AvatarConfig; label: string }[] = [
  { key: "hair", label: "HAIR" },
  { key: "eyes", label: "EYES" },
  { key: "brows", label: "BROWS" },
  { key: "nose", label: "NOSE" },
  { key: "mouth", label: "MOUTH" },
  { key: "ears", label: "EARS" },
  { key: "horns", label: "HORNS / CROWN" },
  { key: "mark", label: "MARKS" },
  { key: "extra", label: "WORN" },
  { key: "collar", label: "COLLAR" },
];

const SWATCHES: { key: keyof AvatarConfig; label: string; colors: string[] }[] = [
  { key: "skin", label: "SKIN", colors: SKIN },
  { key: "hairColor", label: "HAIR COLOUR", colors: HAIR },
  { key: "eyeColor", label: "EYES", colors: EYE },
  { key: "bg", label: "BEHIND YOU", colors: BG },
];

export function AvatarBuilder({ start, fresh }: { start: AvatarConfig; fresh: boolean }) {
  const [c, setC] = useState<AvatarConfig>(start);

  const step = (key: keyof AvatarConfig, by: number) =>
    setC((prev) => {
      const max = OPTION_COUNTS[key];
      return { ...prev, [key]: (((prev[key] + by) % max) + max) % max };
    });

  return (
    <form action={saveAvatar} className="pad" style={{ gap: 12 }}>
      <input type="hidden" name="config" value={JSON.stringify(c)} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          A FACE COSTS NOTHING
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "6px 0 2px",
        }}
      >
        <div
          style={{
            boxShadow: "0 0 0 1px var(--edge)",
            borderRadius: "var(--px-r)",
            overflow: "hidden",
            lineHeight: 0,
          }}
        >
          <AvatarSvg config={c} size={168} />
        </div>
      </div>

      {fresh ? (
        <div className="banner-note banner-purple">
          Nobody has a face here until they make one. Yours shows up on every post,
          whisper and byline you pay for.
        </div>
      ) : null}

      <button
        type="button"
        className="btn"
        onClick={() => setC(avatarFromId(String(Math.random())))}
      >
        ⟳ SOMEONE ELSE ENTIRELY
      </button>

      {SWATCHES.map((row) => (
        <div className="field" key={row.key}>
          <span className="flabel">{row.label}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {row.colors.map((col, i) => (
              <button
                key={col + i}
                type="button"
                aria-label={`${row.label} ${i + 1}`}
                onClick={() => setC((p) => ({ ...p, [row.key]: i }))}
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  cursor: "pointer",
                  background: col,
                  borderRadius: "var(--px-r)",
                  border:
                    c[row.key] === i ? "2px solid var(--pur-bright)" : "1px solid var(--edge)",
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {SHAPES.map((s) => (
        <div
          key={s.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid var(--rule-soft)",
          }}
        >
          <div className="px" style={{ fontSize: 9, color: "var(--dim)", flex: 1 }}>
            {s.label}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ minWidth: 38 }}
            onClick={() => step(s.key, -1)}
            aria-label={`${s.label} previous`}
          >
            ◀
          </button>
          <div
            className="px"
            style={{ fontSize: 9, color: "var(--muted)", width: 34, textAlign: "center" }}
          >
            {c[s.key] + 1}/{OPTION_COUNTS[s.key]}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ minWidth: 38 }}
            onClick={() => step(s.key, 1)}
            aria-label={`${s.label} next`}
          >
            ▶
          </button>
        </div>
      ))}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        WEAR THIS FACE
      </button>
    </form>
  );
}
