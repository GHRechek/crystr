"use client";

import { useEffect, useRef, useState } from "react";

const W = 800;
const H = 600;
const PAPER = "#f4efe6";

/** Pen colours: the app's own, in their darker shades so they show on paper. */
const PENS = [
  { key: "ink", label: "Ink", hex: "#161826" },
  { key: "slate", label: "Slate", hex: "#3f424d" },
  { key: "mag-dark", label: "Deep magenta", hex: "#7a2450" },
  { key: "mag", label: "Magenta", hex: "#e0398a" },
  { key: "pur-dark", label: "Deep purple", hex: "#5d5294" },
  { key: "pur", label: "Purple", hex: "#9184d9" },
  { key: "blu-dark", label: "Deep blue", hex: "#3b5aa8" },
  { key: "blu", label: "Blue", hex: "#4c7df0" },
] as const;

const SIZES = [
  { key: "s", label: "Fine pen", px: 4 },
  { key: "m", label: "Medium pen", px: 9 },
  { key: "l", label: "Thick pen", px: 18 },
] as const;

/** A sheet of paper to draw on with a finger or a mouse. When it is done, onDone gets the
 *  picture as a PNG file. It draws only; nothing leaves the page until the person presses
 *  the button. Anyone who cannot draw here can photograph a drawing instead (the form
 *  offers that below). */
export function DrawingPad({ onDone, disabled }: { onDone: (file: File) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const undo = useRef<ImageData[]>([]);
  const [pen, setPen] = useState<string>(PENS[0].hex);
  const [size, setSize] = useState<number>(SIZES[1].px);
  const [erasing, setErasing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [say, setSay] = useState("");

  useEffect(() => {
    const c = canvasRef.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
  }, []);

  function at(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const g = canvasRef.current!.getContext("2d")!;
    g.strokeStyle = erasing ? PAPER : pen;
    g.fillStyle = erasing ? PAPER : pen;
    g.lineWidth = erasing ? size * 2 : size;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.stroke();
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const g = canvasRef.current!.getContext("2d")!;
    undo.current.push(g.getImageData(0, 0, W, H));
    if (undo.current.length > 12) undo.current.shift();
    setCanUndo(true);
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
    const g = canvasRef.current!.getContext("2d")!;
    const prev = undo.current.pop();
    if (prev) g.putImageData(prev, 0, 0);
    setCanUndo(undo.current.length > 0);
    if (undo.current.length === 0) setDirty(false);
  }

  function clearAll() {
    const g = canvasRef.current!.getContext("2d")!;
    undo.current.push(g.getImageData(0, 0, W, H));
    if (undo.current.length > 12) undo.current.shift();
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    setCanUndo(true);
    setDirty(false);
  }

  function finish() {
    if (!dirty) {
      setSay("Draw something first. Anything counts.");
      return;
    }
    canvasRef.current!.toBlob((blob) => {
      if (!blob) {
        setSay("That did not save. Please try again.");
        return;
      }
      onDone(new File([blob], "drawing.png", { type: "image/png" }));
    }, "image/png");
  }

  const tool = {
    minHeight: 40,
    minWidth: 40,
    padding: 0,
    cursor: "pointer",
    border: 0,
    borderRadius: "var(--px-r)",
  } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label="Drawing pad. Draw with a finger or a mouse. If you cannot, photograph a drawing instead."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          width: "100%",
          aspectRatio: `${W} / ${H}`,
          touchAction: "none",
          cursor: "crosshair",
          borderRadius: "var(--px-r)",
          boxShadow: "0 0 0 2px var(--edge-hover)",
          background: PAPER,
          opacity: disabled ? 0.6 : 1,
        }}
      />

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
                color: "#fff",
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
