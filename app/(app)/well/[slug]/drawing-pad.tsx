"use client";

import { useEffect, useRef, useState } from "react";
import { PATTERNS, SWATCHES, bannerStyle, type PatternKey, type SwatchKey } from "@/lib/banner";

const W = 800;
const H = 600;

/** The page's own colours, plus a warm paper for the plain default. */
const BG_COLOURS: { key: string; label: string; hex: string }[] = [
  { key: "paper", label: "Paper", hex: "#f4efe6" },
  ...SWATCHES.map((s) => ({ key: s.key, label: s.label, hex: s.hex })),
];
const hexOf = (key: string) => BG_COLOURS.find((c) => c.key === key)?.hex ?? "#f4efe6";

type Bg = "plain" | PatternKey;

/** Pen colours: the app's own, light and dark, so something shows on any background. */
const PENS = [
  { key: "ink", label: "Ink", hex: "#161826" },
  { key: "slate", label: "Slate", hex: "#3f424d" },
  { key: "mag-dark", label: "Deep magenta", hex: "#7a2450" },
  { key: "mag", label: "Magenta", hex: "#e0398a" },
  { key: "pur-dark", label: "Deep purple", hex: "#5d5294" },
  { key: "pur", label: "Purple", hex: "#9184d9" },
  { key: "blu-dark", label: "Deep blue", hex: "#3b5aa8" },
  { key: "blu", label: "Blue", hex: "#4c7df0" },
  { key: "mag-light", label: "Soft magenta", hex: "#f0a6c6" },
  { key: "pur-light", label: "Soft purple", hex: "#b5abfc" },
  { key: "blu-light", label: "Soft blue", hex: "#7ea6ff" },
  { key: "mist", label: "Mist", hex: "#f4efe6" },
] as const;

const SIZES = [
  { key: "s", label: "Fine pen", px: 4 },
  { key: "m", label: "Medium pen", px: 9 },
  { key: "l", label: "Thick pen", px: 18 },
] as const;

/** Paints the chosen background on its own canvas, at the picture's full size. The patterns are
 *  the profile banner's, drawn for a bigger, squarer sheet. */
function paintBackground(c: HTMLCanvasElement, bg: Bg, a: string, b: string) {
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = a;
  g.fillRect(0, 0, W, H);
  g.fillStyle = b;
  g.strokeStyle = b;

  if (bg === "stripes-straight") {
    for (let x = 0; x < W; x += 60) g.fillRect(x + 30, 0, 30, H);
  } else if (bg === "stripes-diagonal") {
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(Math.PI / 4);
    const R = Math.hypot(W, H);
    for (let x = -R; x < R; x += 56) g.fillRect(x + 28, -R, 28, R * 2);
    g.restore();
  } else if (bg === "dots") {
    const step = 66;
    for (let row = -1; row * step < H + step; row++) {
      for (let col = -1; col * step < W + step; col++) {
        for (const o of [0, step / 2]) {
          g.beginPath();
          g.arc(col * step + o, row * step + o, 11, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  } else if (bg === "checker") {
    const s = 78;
    for (let y = 0; y * s < H; y++) for (let x = 0; x * s < W; x++) if ((x + y) % 2 === 1) g.fillRect(x * s, y * s, s, s);
  } else if (bg === "gradient") {
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, a);
    grad.addColorStop(1, b);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  } else if (bg === "spiral") {
    g.lineWidth = 13;
    g.lineJoin = "round";
    g.beginPath();
    const k = 6;
    for (let t = 0; t * k <= 520; t += 0.08) {
      const x = W / 2 + t * k * Math.cos(t);
      const y = H / 2 + t * k * Math.sin(t);
      if (t === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}

const tool = {
  minHeight: 40,
  minWidth: 40,
  padding: 0,
  cursor: "pointer",
  border: 0,
  borderRadius: "var(--px-r)",
} as const;


function Colours({ value, onPick, name }: { value: string; onPick: (k: string) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {BG_COLOURS.map((c) => {
        const on = c.key === value;
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.label}
            title={c.label}
            onClick={() => onPick(c.key)}
            style={{
              ...tool,
              background: c.hex,
              color: c.key === "mist" || c.key === "paper" || c.key.endsWith("light") ? "#161826" : "#fff",
              boxShadow: on ? "0 0 0 2px var(--device), 0 0 0 4px var(--text)" : "0 0 0 1px var(--dim)",
            }}
          >
            {on ? "✓" : ""}
          </button>
        );
      })}
    </div>
  );
}

/** A sheet to draw on with a finger or a mouse, on paper or on any of the profile-banner
 *  patterns in the app's colours. The drawing and the background are separate layers, so the
 *  eraser and Undo never eat the background. When it is done, onDone gets the two flattened
 *  into one PNG file. Anyone who cannot draw here can photograph a drawing instead (the form
 *  offers that below). */
export function DrawingPad({ onDone, disabled }: { onDone: (file: File) => void; disabled?: boolean }) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const undo = useRef<ImageData[]>([]);
  const [pen, setPen] = useState<string>(PENS[0].hex);
  const [size, setSize] = useState<number>(SIZES[1].px);
  const [erasing, setErasing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [say, setSay] = useState("");
  const [bg, setBg] = useState<Bg>("plain");
  const [colA, setColA] = useState<string>("paper");
  const [colB, setColB] = useState<string>("pur-dark");

  useEffect(() => {
    if (bgRef.current) paintBackground(bgRef.current, bg, hexOf(colA), hexOf(colB));
  }, [bg, colA, colB]);

  function at(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = inkRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const g = inkRef.current!.getContext("2d")!;
    g.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    g.strokeStyle = pen;
    g.lineWidth = erasing ? size * 2 : size;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.stroke();
  }

  function remember() {
    const g = inkRef.current!.getContext("2d")!;
    undo.current.push(g.getImageData(0, 0, W, H));
    if (undo.current.length > 12) undo.current.shift();
    setCanUndo(true);
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    remember();
    setSay("");
    const p = at(e);
    last.current = p;
    stroke(p, p); // a tap leaves a dot
    setDirty(true);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!last.current) return;
    const p = at(e);
    stroke(last.current, p);
    last.current = p;
  }

  function up() {
    last.current = null;
  }

  function undoOne() {
    const g = inkRef.current!.getContext("2d")!;
    const prev = undo.current.pop();
    if (prev) g.putImageData(prev, 0, 0);
    setCanUndo(undo.current.length > 0);
    if (undo.current.length === 0) setDirty(false);
  }

  function clearAll() {
    remember();
    inkRef.current!.getContext("2d")!.clearRect(0, 0, W, H);
    setDirty(false);
  }

  function finish() {
    if (!dirty) {
      setSay("Draw something first. Anything counts.");
      return;
    }
    const flat = document.createElement("canvas");
    flat.width = W;
    flat.height = H;
    const g = flat.getContext("2d")!;
    g.drawImage(bgRef.current!, 0, 0);
    g.drawImage(inkRef.current!, 0, 0);
    flat.toBlob((blob) => {
      if (!blob) {
        setSay("That did not save. Please try again.");
        return;
      }
      onDone(new File([blob], "drawing.png", { type: "image/png" }));
    }, "image/png");
  }

  const layer = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${W} / ${H}`,
          borderRadius: "var(--px-r)",
          boxShadow: "0 0 0 2px var(--edge-hover)",
          overflow: "hidden",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <canvas ref={bgRef} width={W} height={H} aria-hidden style={layer} />
        <canvas
          ref={inkRef}
          width={W}
          height={H}
          role="img"
          aria-label="Drawing pad. Draw with a finger or a mouse. If you cannot, photograph a drawing instead."
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ ...layer, touchAction: "none", cursor: "crosshair" }}
        />
      </div>

      <div role="radiogroup" aria-label="Pen colour" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {PENS.map((p) => {
          const on = !erasing && pen === p.hex;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.label}
              title={p.label}
              onClick={() => {
                setPen(p.hex);
                setErasing(false);
              }}
              style={{
                ...tool,
                background: p.hex,
                color: p.key === "mist" || p.key.endsWith("light") ? "#161826" : "#fff",
                boxShadow: on ? "0 0 0 2px var(--device), 0 0 0 4px var(--text)" : "0 0 0 1px var(--dim)",
              }}
            >
              {on ? "✓" : ""}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <div role="radiogroup" aria-label="Pen size" style={{ display: "flex", gap: 6 }}>
          {SIZES.map((s) => {
            const on = size === s.px;
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={s.label}
                title={s.label}
                onClick={() => setSize(s.px)}
                className="btn btn-sm"
                style={{ minWidth: 40, padding: 0, borderColor: on ? "var(--text)" : undefined }}
              >
                <span
                  aria-hidden
                  style={{ width: s.px + 2, height: s.px + 2, borderRadius: "50%", background: "var(--text-2)", display: "block" }}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-sm"
          aria-pressed={erasing}
          onClick={() => setErasing((v) => !v)}
          style={{ borderColor: erasing ? "var(--text)" : undefined }}
        >
          ERASER
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={undoOne} disabled={!canUndo}>
          ↶ UNDO
        </button>
        <button type="button" className="btn btn-sm" onClick={clearAll} disabled={!dirty}>
          CLEAR
        </button>
      </div>

      <details className="tile" style={{ padding: 10 }}>
        <summary className="px" style={{ fontSize: 11, color: "var(--blu-soft)", cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center" }}>
          BACKGROUND
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <div role="radiogroup" aria-label="Background pattern" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[{ key: "plain", label: "Plain" }, ...PATTERNS].map((p) => {
              const on = p.key === bg;
              const style =
                p.key === "plain"
                  ? { background: hexOf(colA) }
                  : bannerStyle({ pattern: p.key as PatternKey, a: (colA === "paper" ? "mist" : colA) as SwatchKey, b: (colB === "paper" ? "mist" : colB) as SwatchKey });
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setBg(p.key as Bg)}
                  style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, color: on ? "var(--text)" : "var(--muted)", fontSize: 11, lineHeight: 1.2, textAlign: "center" }}
                >
                  <span style={{ height: 36, borderRadius: "var(--px-r)", boxShadow: on ? "0 0 0 2px var(--device), 0 0 0 4px var(--text)" : "0 0 0 1px var(--edge)", ...style }} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
          <div>
            <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              {bg === "plain" ? "COLOUR" : "FIRST COLOUR"}
            </div>
            <Colours value={colA} onPick={setColA} name="Background first colour" />
          </div>
          {bg !== "plain" ? (
            <div>
              <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                SECOND COLOUR
              </div>
              <Colours value={colB} onPick={setColB} name="Background second colour" />
            </div>
          ) : null}
        </div>
      </details>

      {say ? (
        <div className="px" style={{ fontSize: 11, color: "var(--mag)", lineHeight: 1.7 }}>
          {say.toUpperCase()}
        </div>
      ) : null}

      <button type="button" className="btn btn-lg btn-block btn-purple" onClick={finish} disabled={disabled}>
        USE THIS DRAWING
      </button>
    </div>
  );
}
