"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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


  // The thumbnails follow the face a moment after you stop tapping, so a run of taps doesn't send
  // hundreds of new pictures for the server to draw; the big face and the highlight follow at once.
  const [thumbFace, setThumbFace] = useState(c);
  useEffect(() => {
    const id = window.setTimeout(() => setThumbFace(c), 280);
    return () => window.clearTimeout(id);
  }, [c]);
  const scroller = useRef<HTMLDivElement>(null);
  const pick = useCallback((key: string, v: string) => setC((p) => withChoice(p, key, v)), []);
  // The top above the sides: you pick the top, then the sides that suit it.
  const controls = [...CONTROLS].sort((a, b) => (a.key === "top" && b.key === "hair_back" ? -1 : a.key === "hair_back" && b.key === "top" ? 1 : 0));

  return (
    // The face stays put at the top; only the choices under it scroll.
    <form action={saveAvatar} className="fill-screen" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <input type="hidden" name="config" value={JSON.stringify(c)} />

      <div style={{ flex: "none", padding: "16px 16px 0", background: "var(--device)", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/me" className="btn btn-sm">
            ← ME
          </Link>
          <div className="spacer" />
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            A FACE COSTS NOTHING
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 10px" }}>
          <div style={{ width: 128, height: 128, flex: "none", borderRadius: "var(--px-r)", overflow: "hidden", lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/face/${packed}.png`} alt="Your portrait" width={128} height={128} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
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
      </div>

      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
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
                    style={{ width: 30, height: 30, padding: 0, cursor: "pointer", background: hex, borderRadius: "var(--px-r)", border: on ? "2px solid var(--pur-bright)" : "1px solid var(--edge)" }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Every choice, on your own face, in a row you scroll. Tap one to wear it. */}
        {controls.map((control) => (
          <ThumbRow key={control.key} control={control} list={listFor(control.key, thumbFace)} selected={c[control.key]} face={thumbFace} onPick={pick} root={scroller} />
        ))}

        <button type="submit" className="btn btn-lg btn-purple btn-block">
          WEAR THIS FACE
        </button>
      </div>
    </form>
  );
}

/** What a control steps through. The top leads: every top is on offer, and SIDES only offers the
 *  sides that take the top you have. */
const listFor = (key: string, cfg: PortraitConfig) => (key === "hair_back" ? sidesTaking(cfg.top) : ALLOWED[key]);
/** This face with one choice changed. A top these sides won't take brings the nearest sides that will. */
function withChoice(prev: PortraitConfig, key: string, value: string): PortraitConfig {
  const out = { ...prev, [key]: value };
  if (key === "top") out.hair_back = sidesFor(value, prev.hair_back);
  return out;
}

type Control = (typeof CONTROLS)[number];
/** One thumbnail and the gap after it, sideways. */
const STEP = 78;

/** One control's row of thumbnails: your face with each choice. Only drawn once it comes near the
 *  screen (rows far down don't load until you scroll to them), and only redrawn when the face it
 *  shows, its choices or the one you're wearing change. */
const ThumbRow = memo(
  function ThumbRow({ control, list, selected, face, onPick, root }: { control: Control; list: string[]; selected: string; face: PortraitConfig; onPick: (key: string, v: string) => void; root: React.RefObject<HTMLDivElement | null> }) {
    const ref = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    // Drawn while near the screen (and not after it scrolls well away), and only the thumbnails in view
    // sideways: the rest keep their place as empty squares.
    const [near, setNear] = useState(false);
    const [span, setSpan] = useState<[number, number]>([0, 8]);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const io = new IntersectionObserver((es) => setNear(es.some((e) => e.isIntersecting)), { root: root.current, rootMargin: "250px 0px" });
      io.observe(el);
      return () => io.disconnect();
    }, [root]);
    const measure = () => {
      const r = rowRef.current;
      if (!r) return;
      const from = Math.max(0, Math.floor(r.scrollLeft / STEP) - 2), to = Math.ceil((r.scrollLeft + r.clientWidth) / STEP) + 2;
      setSpan((s) => (s[0] === from && s[1] === to ? s : [from, to]));
    };
    useEffect(measure, [near]);
    const optionals = list.includes(NONE) ? 1 : 0;
    return (
      <div ref={ref} style={{ borderBottom: "1px solid var(--rule-soft)", padding: "8px 0 4px" }}>
        <div className="px" style={{ fontSize: 11, color: "var(--dim)" }}>{control.label}</div>
        <div ref={rowRef} onScroll={() => requestAnimationFrame(measure)} style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 8px", scrollbarWidth: "thin", minHeight: 98 }}>
          {near ? list.map((v, i) => {
            const on = selected === v;
            const name = v === NONE ? "NONE" : control.names?.[v] ?? String(i + 1 - optionals);
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPick(control.key, v)}
                aria-pressed={on}
                aria-label={`${control.label} ${name}`}
                // A row opens with what you're wearing in its middle: sideways only, and only the
                // first time, so a row you've scrolled stays where you left it.
                ref={on ? (el) => {
                  const row = el?.parentElement;
                  if (!el || !row || row.dataset.centred) return;
                  row.scrollLeft = el.offsetLeft - row.offsetLeft - (row.clientWidth - el.clientWidth) / 2;
                  row.dataset.centred = "1";
                } : undefined}
                style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              >
                {i < span[0] || i > span[1] ? <span style={{ display: "block", width: 72, height: 72 }} /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/face/${packPortrait(withChoice(face, control.key, v))}.png`} alt="" width={72} height={72} loading="lazy" decoding="async" style={{ display: "block", imageRendering: "pixelated", outline: on ? "3px solid var(--pur-bright)" : "none", outlineOffset: -3 }} />)}
                <span className="px" style={{ fontSize: 9, color: on ? "var(--pur-bright)" : "var(--muted)" }}>{name}</span>
              </button>
            );
          }) : null}
        </div>
      </div>
    );
  },
  (a, b) => a.face === b.face && a.selected === b.selected && a.control === b.control && a.list.join() === b.list.join(),
);
