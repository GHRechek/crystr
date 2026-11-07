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

      {/* Every choice, on your own face, in a row you scroll. Tap one to wear it. */}
      {controls.map((control) => {
        const list = listFor(control.key, c);
        const optionals = list.includes(NONE) ? 1 : 0;
        return (
          <div key={control.key} style={{ borderBottom: "1px solid var(--rule-soft)", padding: "8px 0 4px" }}>
            <div className="px" style={{ fontSize: 11, color: "var(--dim)" }}>{control.label}</div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 8px", scrollbarWidth: "thin" }}>
              {list.map((v, i) => {
                const on = c[control.key] === v;
                const face = withChoice(c, control.key, v);
                const name = v === NONE ? "NONE" : control.names?.[v] ?? String(i + 1 - optionals);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setC(face)}
                    aria-pressed={on}
                    aria-label={`${control.label} ${name}`}
                    // A row opens with what you're wearing in its middle: sideways only, and
                    // only the first time, so a row you've scrolled stays where you left it.
                    ref={on ? (el) => {
                      const row = el?.parentElement;
                      if (!el || !row || row.dataset.centred) return;
                      row.scrollLeft = el.offsetLeft - row.offsetLeft - (row.clientWidth - el.clientWidth) / 2;
                      row.dataset.centred = "1";
                    } : undefined}
                    style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/face/${packPortrait(face)}.png`} alt="" width={72} height={72} loading="lazy" style={{ display: "block", imageRendering: "pixelated", outline: on ? "3px solid var(--pur-bright)" : "none", outlineOffset: -3 }} />
                    <span className="px" style={{ fontSize: 9, color: on ? "var(--pur-bright)" : "var(--muted)" }}>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        WEAR THIS FACE
      </button>
    </form>
  );
}
