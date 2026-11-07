"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** The build-up while the lock gives: an original rising, quickening zigzag in square waves over a low
 *  triangle drone, ending on a held note that wants to resolve (the fanfare resolves it). About 1.6s. */
function playBuildUp() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const note = (f: number, t: number, len: number, vol: number, type: OscillatorType = "square") => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(vol, now + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + len);
      o.connect(g).connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + len + 0.05);
    };
    // A low drone that swells.
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 98;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 1.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);
    o.connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + 1.7);
    // Climbing in a zigzag, a semitone at a time, each step a little quicker and a little louder.
    const steps = [261.63, 329.63, 277.18, 349.23, 293.66, 369.99, 311.13, 392.0, 329.63, 415.3, 349.23, 440.0, 369.99, 466.16];
    let t = 0;
    steps.forEach((f, i) => {
      const len = 0.13 - i * 0.005;
      note(f, t, len, 0.025 + i * 0.002);
      t += len;
    });
    // The held note at the top, trembling.
    for (let i = 0; i < 6; i++) note(i % 2 ? 493.88 : 523.25, t + i * 0.05, 0.06, 0.05);
    window.setTimeout(() => void ctx.close(), 2200);
  } catch {}
}

/** The lid giving way: a low wooden clack, then a short upward pop. Deeper and rounder than the lock's click. */
function playLidOpen() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const n = Math.floor(ctx.sampleRate * 0.09), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = "lowpass";
    f.frequency.value = 700;
    g.gain.value = 1.2;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
    const o = ctx.createOscillator(), og = ctx.createGain(), t = ctx.currentTime;
    o.type = "square";
    o.frequency.setValueAtTime(160, t + 0.03);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.13);
    og.gain.setValueAtTime(0.0001, t + 0.03);
    og.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(og).connect(ctx.destination);
    o.start(t + 0.03);
    o.stop(t + 0.2);
    window.setTimeout(() => void ctx.close(), 500);
  } catch {}
}

/** A lock turning over, for the key going in: a sharp noise tick, then a lower clunk. */
function playClick() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const tick = (at: number, freq: number, len: number, vol: number) => {
      const n = Math.floor(ctx.sampleRate * len), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf;
      f.type = "bandpass";
      f.frequency.value = freq;
      f.Q.value = 4;
      g.gain.value = vol;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(ctx.currentTime + at);
    };
    tick(0, 3200, 0.03, 0.9);
    tick(0.07, 900, 0.06, 0.8);
    window.setTimeout(() => void ctx.close(), 600);
  } catch {}
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
 *  Open, it is drawn twice: the whole sprite behind, then only its front wall (from the rim down) on top,
 *  so whatever is passed in rises out of the mouth of the chest, in front of the lid. */
const RIM = 21 * 5; // the front rim of the open sprite, in CSS px (row 21 of 39, five px a pixel)
function Chest({ open, quiet, children }: { open: boolean; /** Stop rattling: the key is in. */ quiet?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{ width: 230, height: 195, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", zIndex: 2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ask-shut" src="/ask/chest-closed.png" alt="" width={230} height={165} draggable={false} style={{ display: open ? "none" : "block", imageRendering: "pixelated", animation: quiet ? "none" : undefined }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ask-drop" src="/ask/chest-open.png" alt="" width={225} height={195} draggable={false} style={{ display: open ? "block" : "none", imageRendering: "pixelated" }} />
      {open ? children : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ask-drop" src="/ask/chest-open.png" alt="" width={225} height={195} draggable={false} style={{ display: open ? "block" : "none", position: "absolute", left: 2, bottom: 0, zIndex: 2, clipPath: `inset(${RIM}px 0 0 0)`, imageRendering: "pixelated", pointerEvents: "none" }} />
    </div>
  );
}

/** The key, the same silver as the chest, drawn upright. */
function Key() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/ask/key.png" alt="" width={59} height={108} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />;
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
    // Each pixel is worked out on its own, so every edge is a hard step with no in-between colours.
    const img = ctx.createImageData(W, H), d = img.data;
    const BG = [42, 22, 80], RAY = [74, 29, 104];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      t += 1;
      const pulse = reduce ? 1 : 0.88 + 0.12 * Math.sin(t / 9), spin = reduce ? 0 : t * 0.006, step = Math.PI / 6;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let a = Math.atan2(y + 0.5 - H * RAY_CY, x + 0.5 - W / 2) - spin;
          a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const i = Math.floor(a / step), o = (y * W + x) * 4;
          const col = i % 2 ? BG : RAY, m = i % 2 ? 1 : pulse;
          d[o] = Math.round(BG[0] + (col[0] - BG[0]) * m);
          d[o + 1] = Math.round(BG[1] + (col[1] - BG[1]) * m);
          d[o + 2] = Math.round(BG[2] + (col[2] - BG[2]) * m);
          d[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    draw();
    const id = window.setInterval(draw, 140);
    return () => window.clearInterval(id);
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />;
}

/** Where the rays meet, as a share of the screen's height. The badge comes to rest exactly here. */
const RAY_CY = 0.38;

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
  waiting,
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
  /** What the asker sees on top while the other person decides, e.g. "They're deciding if you're a friend". */
  waiting?: string;
  who: string;
  /** The answer, once there is one (the asker learns it this way). */
  result?: "yes" | "no" | null;
  onYes?: () => void;
  onNo?: () => void;
  onClose?: () => void;
  sound?: boolean;
}) {
  const chestRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; t: number; px: number; py: number } | null>(null);
  const last = useRef<{ x: number; y: number; t: number }[]>([]);
  const [state, setState] = useState<"idle" | "unlocking" | "open" | "thrown">(result === "yes" ? "open" : result === "no" ? "thrown" : "idle");
  const [fling, setFling] = useState<{ x: number; y: number } | null>(null);

  // The asker's side follows the answer when it lands.
  useEffect(() => {
    if (result === "yes" && state === "idle") setState("unlocking");
    if (result === "no" && state === "idle") {
      setFling({ x: 0, y: 900 });
      setState("thrown");
    }
  }, [result, state]);

  useEffect(() => {
    // The key goes in: a click, the world dims, a build-up, and then the lid flies open.
    if (state === "unlocking") {
      if (sound) {
        playClick();
        window.setTimeout(playBuildUp, 140);
      }
      const id = window.setTimeout(() => setState("open"), 1850);
      return () => window.clearTimeout(id);
    }
    if (state === "open" && sound) {
      playLidOpen();
      window.setTimeout(playFanfare, 200);
    }
    if (state === "thrown") {
      if (sound) playWhoosh();
      const id = window.setTimeout(() => onClose?.(), 900);
      return () => window.clearTimeout(id);
    }
  }, [state, sound, onClose]);

  // How far the badge climbs: from the chest's mouth to the point where the rays meet.
  useLayoutEffect(() => {
    if (state !== "open") return;
    const b = badgeRef.current, sc = sceneRef.current;
    if (!b || !sc) return;
    const r = b.getBoundingClientRect(), box = sc.getBoundingClientRect();
    b.style.setProperty("--rise", `${Math.round(box.top + box.height * RAY_CY - (r.top + r.height / 2))}px`);
  }, [state]);

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
      setState("unlocking");
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
    <div ref={sceneRef} role="dialog" aria-label={question} className="ask-scene">
      <Rays />
      <div className={`ask-dim${state === "unlocking" ? " is-on" : state === "open" ? " is-after" : ""}`} aria-hidden />
      <div className="px ask-question">
        {side === "wait" && (state === "idle" || state === "unlocking") ? (
          <>
            {waiting ?? `${who} is deciding`}
            <span className="ask-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>
          </>
        ) : (
          question
        )}
      </div>

      <div className="ask-stage">
        <div ref={chestRef}>
          <Chest open={state === "open"} quiet={state !== "idle"}>
            <div ref={badgeRef} className="ask-badge">
              <BadgeArt b={{ art: badge.art, slug: badge.slug, tiers: badge.tiers ?? 1 }} got tier={1} size={84} />
              <span className="ask-glint g1" aria-hidden />
              <span className="ask-glint g2" aria-hidden />
              <span className="ask-glint g3" aria-hidden />
            </div>
          </Chest>
        </div>
        <div className="px ask-title">{state === "open" && side === "ask" ? title.toUpperCase() : ""}</div>
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
            onKeyDown={(e) => {
              if (!canDrag) return;
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setState("unlocking"); onYes?.(); }
              if (e.key === "Delete" || e.key === "Backspace" || e.key === "Escape") { e.preventDefault(); setFling({ x: 0, y: 900 }); setState("thrown"); onNo?.(); }
            }}
            tabIndex={side === "ask" ? 0 : undefined}
            aria-label={side === "ask" ? "The key. Drag it to the chest for yes, throw it away for no. Or press Enter for yes, Delete for no." : "The key"}
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
          <div className="px ask-result is-yes">{side === "wait" ? (
              <>
                YOU EARNED THE<span className="ask-earned">{title.toUpperCase()}</span>BADGE!
              </>
            ) : (
              "UNLOCKED!"
            )}</div>
        ) : state === "thrown" || state === "unlocking" ? null : side === "wait" ? (
          null
        ) : (
          <div className="ask-hints" aria-hidden="true">
            <div className="px ask-hint ask-yes"><b>YES!</b><span>UNLOCK</span><span style={{ marginTop: 0 }}>THE CHEST!</span></div>
            <div className="px ask-hint ask-no"><b>NO!</b><span>TOSS</span><span style={{ marginTop: 0 }}>THE KEY!</span></div>
          </div>
        )}
        {onClose && (state === "open" || side === "wait") ? (
          <button type="button" className={`px ask-close${state === "open" ? " is-done" : ""}`} onClick={onClose}>{state === "open" ? "CLOSE" : "CLOSE · KEEP WAITING"}</button>
        ) : null}
      </div>
    </div>
  );
}
