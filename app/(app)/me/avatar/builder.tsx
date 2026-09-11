"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveAvatar } from "@/lib/actions";
import {
  ALLOWED,
  BG_CHOICES,
  CONTROLS,
  EYE_CHOICES,
  HAIR_CHOICES,
  NONE,
  SKIN_CHOICES,
  packPortrait,
  randomPortrait,
  type PortraitConfig,
} from "@/lib/portrait/core";

/** The four pickers the original tool offers, in its own order. */
const COLOURS: { key: string; label: string; choices: string[] }[] = [
  { key: "skin", label: "SKIN COLOUR", choices: SKIN_CHOICES },
  { key: "hair_colour", label: "HAIR COLOUR", choices: HAIR_CHOICES },
  { key: "eye", label: "EYE COLOUR", choices: EYE_CHOICES },
  { key: "bg", label: "BG COLOUR", choices: BG_CHOICES },
];

export function AvatarBuilder({ start, fresh }: { start: PortraitConfig; fresh: boolean }) {
  const [c, setC] = useState<PortraitConfig>(start);

  const packed = useMemo(() => packPortrait(c), [c]);

  const step = (key: string, by: number) =>
    setC((prev) => {
      const list = ALLOWED[key];
      const at = Math.max(0, list.indexOf(prev[key]));
      const next = (((at + by) % list.length) + list.length) % list.length;
      return { ...prev, [key]: list[next] };
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

      {/* Sticks to the top so the face stays in view while you work down the
          options — otherwise every change is a scroll away. */}
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
        <div
          style={{
            width: 104,
            height: 104,
            flex: "none",
            boxShadow: "0 0 0 1px var(--edge)",
            borderRadius: "var(--px-r)",
            overflow: "hidden",
            lineHeight: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/face/${packed}.png`}
            alt="Your portrait"
            width={104}
            height={104}
            style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <button type="button" className="btn btn-sm" onClick={() => setC(randomPortrait())}>
            ⟳ SOMEONE ELSE
          </button>
          <button type="submit" className="btn btn-sm btn-purple">
            WEAR THIS FACE
          </button>
        </div>
      </div>

      {fresh ? (
        <div className="banner-note banner-purple">
          Nobody has a face here until they make one. Yours shows up on every post,
          whisper and byline you pay for.
        </div>
      ) : null}

      {COLOURS.map((row) => (
        <div className="field" key={row.key}>
          <span className="flabel">{row.label}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {row.choices.map((hex) => {
              const on = c[row.key] === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={`${row.label} ${hex}`}
                  aria-pressed={on}
                  onClick={() => setC((p) => ({ ...p, [row.key]: hex }))}
                  style={{
                    width: 30,
                    height: 30,
                    padding: 0,
                    cursor: "pointer",
                    background: hex,
                    borderRadius: "var(--px-r)",
                    border: on ? "2px solid var(--pur-bright)" : "1px solid var(--edge)",
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}

      {CONTROLS.map((control) => {
        const list = ALLOWED[control.key];
        const at = Math.max(0, list.indexOf(c[control.key]));
        const optionals = control.optional ? 1 : 0;
        return (
          <div
            key={control.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--rule-soft)",
            }}
          >
            <div className="px" style={{ fontSize: 9, color: "var(--dim)", flex: 1 }}>
              {control.label}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 38 }}
              onClick={() => step(control.key, -1)}
              aria-label={`${control.label} previous`}
            >
              ◀
            </button>
            <div
              className="px"
              style={{ fontSize: 9, color: "var(--muted)", width: 46, textAlign: "center" }}
            >
              {c[control.key] === NONE ? "NONE" : `${at + 1 - optionals}/${list.length - optionals}`}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 38 }}
              onClick={() => step(control.key, 1)}
              aria-label={`${control.label} next`}
            >
              ▶
            </button>
          </div>
        );
      })}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        WEAR THIS FACE
      </button>
    </form>
  );
}
