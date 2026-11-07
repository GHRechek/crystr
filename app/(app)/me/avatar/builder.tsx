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
  sidesFor,
  sidesTaking,
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

  const [open, setOpen] = useState<string | null>(null);

  /** What a control steps through. The top leads: every top is on offer, and
   *  SIDES only offers the sides that take the top you have. */
  const listFor = (key: string, cfg: PortraitConfig) => (key === "hair_back" ? sidesTaking(cfg.top) : ALLOWED[key]);
  /** This face with one choice changed. A top these sides won't take brings
   *  the nearest sides that will. */
  const withChoice = (prev: PortraitConfig, key: string, value: string): PortraitConfig => {
    const out = { ...prev, [key]: value };
    if (key === "top") out.hair_back = sidesFor(value, prev.hair_back);
    return out;
  };
  const step = (key: string, by: number) =>
    setC((prev) => {
      const list = listFor(key, prev);
      const at = Math.max(0, list.indexOf(prev[key]));
      return withChoice(prev, key, list[(((at + by) % list.length) + list.length) % list.length]);
    });
  // The top above the sides: you pick the top, then the sides that suit it.
  const controls = [...CONTROLS].sort((a, b) => (a.key === "top" && b.key === "hair_back" ? -1 : a.key === "hair_back" && b.key === "top" ? 1 : 0));

  return (
    <form action={saveAvatar} className="pad" style={{ gap: 12 }}>
      <input type="hidden" name="config" value={JSON.stringify(c)} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
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
            width: 128,
            height: 128,
            flex: "none",
            boxShadow: "none",
            borderRadius: "var(--px-r)",
            overflow: "hidden",
            lineHeight: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/face/${packed}.png`}
            alt="Your portrait"
            width={128}
            height={128}
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

      {controls.map((control) => {
        const list = listFor(control.key, c);
        const at = Math.max(0, list.indexOf(c[control.key]));
        const optionals = list.includes(NONE) ? 1 : 0;
        return (
          <div key={control.key}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--rule-soft)",
            }}
          >
            <button
              type="button"
              className="px"
              onClick={() => setOpen((o) => (o === control.key ? null : control.key))}
              aria-expanded={open === control.key}
              style={{ fontSize: 11, color: open === control.key ? "var(--pur-bright)" : "var(--dim)", flex: 1, textAlign: "left", background: "none", border: 0, padding: "8px 0", cursor: "pointer" }}
            >
              {control.label} {open === control.key ? "▴" : "▾"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 40 }}
              onClick={() => step(control.key, -1)}
              aria-label={`${control.label} previous`}
            >
              ◀
            </button>
            <div
              className="px"
              style={{ fontSize: 11, color: "var(--muted)", width: 46, textAlign: "center" }}
            >
              {c[control.key] === NONE
                ? "NONE"
                : control.names?.[c[control.key]] ?? `${at + 1 - optionals}/${list.length - optionals}`}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 40 }}
              onClick={() => step(control.key, 1)}
              aria-label={`${control.label} next`}
            >
              ▶
            </button>
          </div>
          {open === control.key ? (
            // Every choice, on your own face, in a row you scroll. Tap one to wear it.
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 10px", scrollbarWidth: "thin" }}>
              {list.map((v, i) => {
                const on = c[control.key] === v;
                const face = withChoice(c, control.key, v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setC(face)}
                    aria-pressed={on}
                    // Opens on what you're wearing, scrolled into the middle of the row.
                    ref={on ? (el) => { el?.scrollIntoView({ block: "nearest", inline: "center" }); } : undefined}
                    aria-label={`${control.label} ${v === NONE ? "none" : control.names?.[v] ?? v}`}
                    style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/face/${packPortrait(face)}.png`} alt="" width={72} height={72} loading="lazy" style={{ display: "block", imageRendering: "pixelated", outline: on ? "3px solid var(--pur-bright)" : "none", outlineOffset: -3 }} />
                    <span className="px" style={{ fontSize: 9, color: on ? "var(--pur-bright)" : "var(--muted)" }}>{v === NONE ? "NONE" : control.names?.[v] ?? i + 1 - optionals}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          </div>
        );
      })}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        WEAR THIS FACE
      </button>
    </form>
  );
}
