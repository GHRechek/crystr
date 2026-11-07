"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeArt } from "@/components/badges";

/** A short, original 8-bit fanfare: a rising arpeggio and a held chord, square waves. Plays once. */
export function playFanfare() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const notes: [number, number, number][] = [
      [392.0, 0.0, 0.12], [523.25, 0.13, 0.12], [659.25, 0.26, 0.12], [783.99, 0.39, 0.12],
      [698.46, 0.6, 0.12], [880.0, 0.73, 0.12], [1046.5, 0.86, 0.7],
      [659.25, 0.86, 0.7], [523.25, 0.86, 0.7],
    ];
    for (const [f, t, len] of notes) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + len);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + len + 0.05);
    }
    window.setTimeout(() => void ctx.close(), 2200);
  } catch {
    // No sound is fine.
  }
}

/** A whoosh, for a key thrown away. */
function playWhoosh() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(600, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.35);
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.45);
    window.setTimeout(() => void ctx.close(), 800);
  } catch {}
}

/** The chest: a pixel sprite, silver-blue frame and CRYSTR purple panels. Shut until the key goes in.
 *  Both states sit on the same baseline so the lid swings up rather than the chest jumping. */
function Chest({ open }: { open: boolean }) {
  return (
    <div style={{ width: 230, height: 195, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", zIndex: 2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ask/chest-closed.png" alt="" width={230} height={165} draggable={false} style={{ display: open ? "none" : "block", imageRendering: "pixelated" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ask/chest-open.png" alt="" width={225} height={195} draggable={false} style={{ display: open ? "block" : "none", imageRendering: "pixelated" }} />
    </div>
  );
}

/** The key, the same silver as the chest, drawn upright. */
function Key() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/ask/key.png" alt="" width={49} height={98} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />;
}

/** The background: wide pixel-edged rays in the CRYSTR colours, drawn small and scaled up, turning slowly
 *  and gently strobing. */
function Rays() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const W = 60, H = 110;
    c.width = W;
    c.height = H;
    let t = 0;
    const cols = ["#5a1f6e", "#2d2f8a"];
    const draw = () => {
      t += 1;
      const pulse = 0.82 + 0.18 * Math.sin(t / 6);
      ctx.fillStyle = "#2a1650";
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H * 0.5, n = 8, r = 200;
      const spin = t * 0.025;
      for (let i = 0; i < n; i++) {
        const a0 = spin + (i / n) * Math.PI * 2;
        const a1 = a0 + Math.PI / n;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = cols[i % 2];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    const id = window.setInterval(draw, 140);
    return () => window.clearInterval(id);
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />;
}

export type AskSide = "ask" | "wait";

/** The screen both people see when one asks the other, face to face, to confirm a quest (or a trade).
 *  A shut chest, the question on top, and a key floating at the bottom. The person being asked drags the
 *  key to the chest for YES (it unlocks, the badge rises out to a fanfare) or throws it off the screen for
 *  NO (the scene closes for both). The asker watches the same scene, waiting, and sees it play out. */
export function AskScene({
  side,
  badge,
  title,
  question,
  who,
  result,
  onYes,
  onNo,
  onClose,
  sound = true,
}: {
  side: AskSide;
  badge: { art: string | null; slug: string; tiers?: number };
  title: string;
  question: string;
  who: string;
  /** The answer, once there is one (the asker learns it this way). */
  result?: "yes" | "no" | null;
  onYes?: () => void;
  onNo?: () => void;
  onClose?: () => void;
  sound?: boolean;
}) {
  const chestRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; t: number; px: number; py: number } | null>(null);
  const last = useRef<{ x: number; y: number; t: number }[]>([]);
  const [state, setState] = useState<"idle" | "open" | "thrown">(result === "yes" ? "open" : result === "no" ? "thrown" : "idle");
  const [fling, setFling] = useState<{ x: number; y: number } | null>(null);

  // The asker's side follows the answer when it lands.
  useEffect(() => {
    if (result === "yes" && state === "idle") setState("open");
    if (result === "no" && state === "idle") {
      setFling({ x: 0, y: 900 });
      setState("thrown");
    }
  }, [result, state]);

  useEffect(() => {
    if (state === "open" && sound) window.setTimeout(playFanfare, 500);
    if (state === "thrown") {
      if (sound) playWhoosh();
      const id = window.setTimeout(() => onClose?.(), 900);
      return () => window.clearTimeout(id);
    }
  }, [state, sound, onClose]);

  const canDrag = side === "ask" && state === "idle";

  const down = (e: React.PointerEvent) => {
    if (!canDrag) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), px: drag?.x ?? 0, py: drag?.y ?? 0 };
    last.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: start.current.px + e.clientX - start.current.x, y: start.current.py + e.clientY - start.current.y });
    last.current = [...last.current.slice(-4), { x: e.clientX, y: e.clientY, t: performance.now() }];
  };
  const up = (e: React.PointerEvent) => {
    if (!start.current) return;
    start.current = null;
    // Dropped on the chest: YES.
    const box = chestRef.current?.getBoundingClientRect();
    if (box && e.clientX > box.left && e.clientX < box.right && e.clientY > box.top && e.clientY < box.bottom) {
      setState("open");
      onYes?.();
      return;
    }
    // Thrown hard, or dragged out of the screen: NO.
    const a = last.current[0], b = last.current[last.current.length - 1];
    const dt = Math.max(1, b.t - a.t);
    const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
    const speed = Math.hypot(vx, vy);
    const off = e.clientX < 0 || e.clientY < 0 || e.clientX > window.innerWidth || e.clientY > window.innerHeight;
    if (speed > 1.1 || off) {
      setFling({ x: (drag?.x ?? 0) + vx * 900, y: (drag?.y ?? 0) + vy * 900 });
      setState("thrown");
      onNo?.();
      return;
    }
    // Let go somewhere else: it drifts home.
    setDrag(null);
  };

  const keyPos = fling ?? drag ?? { x: 0, y: 0 };
  return (
    <div role="dialog" aria-label={question} className="ask-scene">
      <Rays />
      <div className="px ask-question">{question}</div>

      <div className="ask-stage">
        {state === "open" ? (
          <div className="ask-badge">
            <BadgeArt b={{ art: badge.art, slug: badge.slug, tiers: badge.tiers ?? 1 }} got tier={1} size={84} />
            <span className="ask-glint g1" aria-hidden />
            <span className="ask-glint g2" aria-hidden />
            <span className="ask-glint g3" aria-hidden />
          </div>
        ) : null}
        <div ref={chestRef}>
          <Chest open={state === "open"} />
        </div>
        <div className="px ask-title">{state === "open" ? title.toUpperCase() : ""}</div>
      </div>

      <div className="ask-bottom">
        {state === "idle" ? (
          <div
            className={`ask-key${drag ? " is-held" : ""}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => { start.current = null; setDrag(null); }}
            style={{ transform: `translate(${keyPos.x}px, ${keyPos.y}px)`, cursor: canDrag ? "grab" : "default", touchAction: "none" }}
            aria-label={side === "ask" ? "The key: drag it to the chest for yes, throw it away for no" : "The key"}
            role={side === "ask" ? "button" : undefined}
          >
            <Key />
          </div>
        ) : state === "thrown" ? (
          <div className="ask-key is-thrown" style={{ transform: `translate(${keyPos.x}px, ${keyPos.y}px) rotate(540deg)` }}>
            <Key />
          </div>
        ) : null}

        {state === "open" ? (
          <div className="px ask-result is-yes">{side === "wait" ? `${who.toUpperCase()} SAID YES!` : "UNLOCKED!"}</div>
        ) : state === "thrown" ? null : side === "wait" ? (
          <div className="px ask-waiting">
            WAITING ON {who.toUpperCase()}<span className="ask-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>
          </div>
        ) : (
          <div className="ask-hints">
            <span className="px ask-yes">YES? UNLOCK THE CHEST</span>
            <span className="px ask-no">NO? THROW THE KEY AWAY</span>
          </div>
        )}
        {side === "ask" && state === "idle" ? (
          <div className="ask-keyboard">
            <button type="button" className="px" onClick={() => { setState("open"); onYes?.(); }}>YES</button>
            <button type="button" className="px" onClick={() => { setFling({ x: 0, y: 900 }); setState("thrown"); onNo?.(); }}>NO</button>
          </div>
        ) : null}
        {onClose && (state === "open" || side === "wait") ? (
          <button type="button" className="px ask-close" onClick={onClose}>{state === "open" ? "CLOSE" : "CLOSE · KEEP WAITING"}</button>
        ) : null}
      </div>
    </div>
  );
}
