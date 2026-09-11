"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveAvatar } from "@/lib/actions";
import {
  ALLOWED,
  BACKGROUNDS,
  COLOR_KEYS,
  DRAW_ORDER,
  NONE,
  RAMPS,
  keyFor,
  packFace,
  randomFace,
  type FaceConfig,
} from "@/lib/faces/core";

const LABELS: Record<string, string> = {
  body: "BUILD",
  cloths: "WHAT YOU WEAR",
  neck: "COLLAR",
  mouth: "MOUTH",
  nose: "NOSE",
  beard: "BEARD",
  eyes: "EYES",
  brows: "BROWS",
  glasses: "GLASSES",
  hairBase: "HAIR",
  hairBack: "HAIR BEHIND",
  hairAccessory: "WORN IN YOUR HAIR",
  ears: "EARS",
  horns: "HORNS",
};

/** The order the controls read in — face first, then the fantasy bits. */
const SHAPE_ORDER = [
  "hairBase", "hairBack", "hairAccessory", "eyes", "brows", "nose", "mouth",
  "ears", "horns", "beard", "glasses", "cloths", "neck", "body",
];

export function AvatarBuilder({ start, fresh }: { start: FaceConfig; fresh: boolean }) {
  const [c, setC] = useState<FaceConfig>(start);

  const packed = useMemo(() => packFace(c), [c]);

  const step = (key: string, by: number) =>
    setC((prev) => {
      const list = ALLOWED[key];
      const at = Math.max(0, list.indexOf(prev[key]));
      const next = (((at + by) % list.length) + list.length) % list.length;
      return { ...prev, [key]: list[next] };
    });

  const shapeKeys = SHAPE_ORDER.filter((k) =>
    DRAW_ORDER.some((l) => !l.derived && keyFor(l.dir) === k),
  );

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
          <button type="button" className="btn btn-sm" onClick={() => setC(randomFace())}>
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

      {COLOR_KEYS.map((row) => (
        <div className="field" key={row.key}>
          <span className="flabel">{row.label}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALLOWED[row.key].map((name) => {
              const ramp = RAMPS[name];
              const on = c[row.key] === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={`${row.label} ${name}`}
                  aria-pressed={on}
                  onClick={() => setC((p) => ({ ...p, [row.key]: name }))}
                  style={{
                    width: 30,
                    height: 30,
                    padding: 0,
                    cursor: "pointer",
                    borderRadius: "var(--px-r)",
                    border: on ? "2px solid var(--pur-bright)" : "1px solid var(--edge)",
                    background: `linear-gradient(135deg, ${ramp[0]} 0 50%, ${ramp[1]} 50% 100%)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div className="field">
        <span className="flabel">BEHIND YOU</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {BACKGROUNDS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Background ${hex}`}
              aria-pressed={c.bg === hex}
              onClick={() => setC((p) => ({ ...p, bg: hex }))}
              style={{
                width: 30,
                height: 30,
                padding: 0,
                cursor: "pointer",
                background: hex,
                borderRadius: "var(--px-r)",
                border: c.bg === hex ? "2px solid var(--pur-bright)" : "1px solid var(--edge)",
              }}
            />
          ))}
        </div>
      </div>

      {shapeKeys.map((key) => {
        const list = ALLOWED[key];
        const at = Math.max(0, list.indexOf(c[key]));
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--rule-soft)",
            }}
          >
            <div className="px" style={{ fontSize: 9, color: "var(--dim)", flex: 1 }}>
              {LABELS[key] ?? key.toUpperCase()}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 38 }}
              onClick={() => step(key, -1)}
              aria-label={`${LABELS[key]} previous`}
            >
              ◀
            </button>
            <div
              className="px"
              style={{ fontSize: 9, color: "var(--muted)", width: 46, textAlign: "center" }}
            >
              {c[key] === NONE ? "NONE" : `${at + 1}/${list.length}`}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 38 }}
              onClick={() => step(key, 1)}
              aria-label={`${LABELS[key]} next`}
            >
              ▶
            </button>
          </div>
        );
      })}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        WEAR THIS FACE
      </button>

      <div className="empty" style={{ paddingTop: 2, lineHeight: 1.7 }}>
        PORTRAIT ART BY V-KTOR · MIT
      </div>
    </form>
  );
}
