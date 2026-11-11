"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BodyPortal } from "@/components/portal";
import { playBuildUp, playFanfare, playWhoosh } from "@/components/ask-scene";
import { Creature } from "@/components/encounter";
import { abandonBlend, feedBlend, type BlendFeed } from "@/lib/actions";
import { HISTORIKAL, RARITY_COLOR, RARITY_NAME, type Element, type Rarity } from "@/lib/historikals";
import { cadence, creatureVoice, playCry, speakBabble, type Beat } from "@/lib/babble";
import { historikalSrc } from "@/lib/historikals";

/** One of the four going in: what the scene needs to draw it and to name it. */
export type BlendOffer = { id: number; slug: string; name: string; rarity: Rarity; types: Element[] };

const up = (s: string) => s.toUpperCase();
const W = 390;      // the scene is laid out on this width and scaled to the screen
const H = 640;
const PORTAL = 354;

/** What they say as they go, by family, most saying nothing. The undead have been waiting; beasts only growl. */
const LINES: { test: RegExp; lines: string[]; chance: number }[] = [
  { test: /ghost|skeleton|zombie|hag|lich|wraith|undead|bone|grave|mummy|phantom|spectre|banshee/, lines: ["I'VE BEEN WAITING FOR THIS…", "SOON!", "FINALLY.", "BACK TO THE DARK…"], chance: 0.7 },
  { test: /rat|mouse/, lines: ["SQUEAK!"], chance: 0.8 },
  { test: /slime|snake|wyrm|dragon|gargoyle|bat|wolf|spider|beast|lizard|toad|frog|crab|fish|bird|hound|cat|fox|bear|boar/, lines: ["GRRR!", "HSSS…", "ROAR!", "GRRRAAH!"], chance: 0.6 },
  { test: /goblin|orc|troll|ogre|gremlin/, lines: ["OI!", "NOT AGAIN!", "WAS IT SOMETHING I SAID?", "AAAAAH!"], chance: 0.5 },
];
const ANY = ["AAAAAH!", "A NEW CHANCE…", "I'M NOT READY!", "CHANGE IS INEVITABLE…", "HERE WE GO…"];
/** What it cries as the void takes it: beasts roar, rats squeak, the undead wail, the rest scream. */
function cryFor(slug: string): "roar" | "squeak" | "wail" | "scream" {
  if (/rat|mouse/.test(slug)) return "squeak";
  if (LINES[2].test.test(slug)) return "roar";
  if (LINES[0].test.test(slug)) return "wail";
  return "scream";
}
function lineFor(slug: string): string | null {
  for (const f of LINES) if (f.test.test(slug)) return Math.random() < f.chance ? f.lines[Math.floor(Math.random() * f.lines.length)] : null;
  return Math.random() < 0.33 ? ANY[Math.floor(Math.random() * ANY.length)] : null;
}

/** Chunky pink stars, blinking on their own cycles. */
function Stars() {
  const stars = useMemo(() => {
    let a = 21;
    const r = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    return Array.from({ length: 46 }, () => ({ x: 6 + Math.floor(r() * 378), y: 30 + Math.floor(r() * 600), sz: [4, 4, 6, 6, 8][Math.floor(r() * 5)], d: -(r() * 3), dur: 1.4 + r() * 2.2 }));
  }, []);
  return <>{stars.map((s, i) => <i key={i} className="bl-star" style={{ left: s.x, top: s.y, width: s.sz, height: s.sz, animationDelay: `${s.d}s`, animationDuration: `${s.dur}s` }} />)}</>;
}

type Px = { ox: number; oy: number; ang: number; sp: number; ph: number };
/** The pixels of a creature, for the snap: every other pixel of a 48px copy of its picture. */
async function pixelsOf(src: string): Promise<Px[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode().catch(() => undefined);
  const c = document.createElement("canvas"); c.width = 48; c.height = 48;
  const g = c.getContext("2d")!; g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, 48, 48);
  const out: Px[] = [];
  try {
    const d = g.getImageData(0, 0, 48, 48).data;
    for (let y = 0; y < 48; y += 2) for (let x = 0; x < 48; x += 2) if (d[(y * 48 + x) * 4 + 3] > 40) out.push({ ox: (x - 24) * 1.33, oy: (y - 24) * 1.33, ang: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 0.8, ph: Math.random() * 6 });
  } catch {
    // A picture the canvas may not read: a plain block of sparkles instead.
    for (let y = -20; y < 20; y += 3) for (let x = -14; x < 14; x += 3) out.push({ ox: x, oy: y, ang: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 0.8, ph: Math.random() * 6 });
  }
  return out;
}

/** MANA BLEND. The portal; ARE YOU SURE; then each of the four in turn held at the bottom like the key:
 *  drag it up into the void (or tap YES), and it floats to the centre, flashes, bursts into sparkles that
 *  gather into a comet and whirl in. NO on the first one closes the scene. NO later asks again, because the
 *  ones already in are gone. The fourth resolves the pot: a flash in the new rarity's colour, and the new
 *  one rises out. */
export function BlendScene({ offers, onDone, onClose }: {
  offers: BlendOffer[];
  /** The new Historikal, or null when backed out. */
  onDone: (got: { item: number; slug: string; name: string; types: Element[]; rarity: Rarity } | null) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"confirm" | "offer" | "going" | "abandon" | "result" | "error">("offer");
  const [i, setI] = useState(0);
  const [fed, setFed] = useState(0);
  const [got, setGot] = useState<{ item: number; slug: string; name: string; types: Element[]; rarity: Rarity; evolved: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [line, setLine] = useState<{ words: string[]; beats: Beat[]; t0: number } | null>(null);
  const [shown, setShown] = useState(0);
  // The words of the line turn up on the cadence they are spoken at.
  useEffect(() => {
    if (!line) { setShown(0); return; }
    const ids = line.beats.map((b, k) => window.setTimeout(() => setShown(k + 1), Math.max(0, b.at * 1000)));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [line]);
  const [frame, setFrame] = useState(0);
  const scene = useRef<HTMLDivElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const cur = offers[i];

  // The scene is drawn at 390×640 and scaled to fit the screen.
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  // The portal's four frames, six a second.
  useEffect(() => { const id = window.setInterval(() => setFrame((f) => (f + 1) % 4), 166); return () => window.clearInterval(id); }, []);

  // Dragging the creature: up into the portal is yes; let go anywhere else and it comes back.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => { if (stage !== "offer") return; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); start.current = { x: e.clientX, y: e.clientY }; },
    onPointerMove: (e: React.PointerEvent) => { if (!start.current) return; setDrag({ x: (e.clientX - start.current.x) / scale, y: (e.clientY - start.current.y) / scale }); },
    onPointerUp: (e: React.PointerEvent) => {
      if (!start.current) return;
      const dy = (e.clientY - start.current.y) / scale; start.current = null;
      if (dy < -120) { void go(); } else setDrag(null);
    },
    onPointerCancel: () => { start.current = null; setDrag(null); },
  };

  // Going in: the server first (it is gone at once), then the show.
  const anim = useRef<{ t0: number; px: Px[]; src: string; done: BlendFeed | null; cried?: boolean } | null>(null);
  const stop = useRef<() => void>(() => undefined);
  const go = async () => {
    if (stage !== "offer" || !cur) return;
    setStage("going"); setDrag(null);
    const said = lineFor(cur.slug);
    const voice = creatureVoice(cur.slug, HISTORIKAL.get(cur.slug)?.hearts ?? 3);
    if (said) {
      const words = said.split(/\s+/);
      const beats = cadence(words, voice.rate ?? 1.35);
      setLine({ words, beats, t0: performance.now() });
      window.setTimeout(() => speakBabble(words, voice, { beats }), 600);
    } else setLine(null);
    stop.current = () => undefined;
    playWhoosh();
    const src = historikalSrc(cur.slug, 1, cur.types[0]);
    let px: Px[] = [], r: BlendFeed;
    try { [px, r] = await Promise.all([pixelsOf(src), feedBlend(cur.id)]); }
    catch { r = { ok: false, code: "error" }; }
    if (!r.ok) {
      const why: Record<string, string> = { mixed: `The void already holds ${r.count ?? 0} ${RARITY_NAME[(r.rarity as Rarity) ?? "common"]}${(r.count ?? 0) === 1 ? "" : "s"}. Only that rarity can follow.`, top: "Epics and mythics can't go in.", favorite: "A favourite can't go in.", lineup: "It is in your lineup.", in_battle: "It is in a battle.", not_yours: "It has moved on.", none: "The void gave nothing back. Tell a witch." };
      setErr(why[r.code] ?? "Something went wrong."); setStage("error"); return;
    }
    anim.current = { t0: performance.now(), px, src, done: r };
    setFed((n) => n + 1);
  };

  // The show, on a canvas: float (3s), flash (0.8s), sparkles → comet → whirl (3s).
  useEffect(() => {
    if (stage !== "going") return;
    let raf = 0;
    const CX = W / 2, CY = H / 2;
    const spr = document.getElementById("bl-sprite") as HTMLElement | null;
    // The speech bubble rides with the creature, just over its head.
    const follow = (x: number, y: number) => { const b = document.getElementById("bl-bubble"); if (b) { b.style.left = `${x + 10}px`; b.style.top = `${y - 40}px`; b.style.margin = "0"; } };
    const tick = () => {
      const a = anim.current; const cv = dust.current;
      if (!a || !cv) {
        // Not under way yet (the server is still being asked): hold the creature where it was and keep ticking.
        if (spr) { spr.style.opacity = "1"; spr.style.filter = ""; spr.style.transform = `translate(${CX}px, ${H - 120}px)`; }
        follow(CX, H - 120);
        raf = requestAnimationFrame(tick); return;
      }
      const g2 = cv.getContext("2d")!; g2.clearRect(0, 0, W, H);
      const u = (performance.now() - a.t0) / 1000;
      const t = performance.now() / 1000;
      if (spr) {
        if (u < 3.0) { const v = u / 3.0, e = v * v * (3 - 2 * v); const x = CX - 10 + 10 * e + Math.sin(v * 6) * (1 - v) * 6, y = CY + 130 - 130 * e; spr.style.opacity = "1"; spr.style.filter = ""; spr.style.transform = `translate(${x}px, ${y}px)`; follow(x, y); }
        else if (u < 3.8) { const f = Math.floor((u - 3.0) / 0.1) % 2; spr.style.transform = `translate(${CX}px, ${CY}px)`; spr.style.filter = f ? "brightness(0) invert(1)" : "brightness(0) invert(1) sepia(1) saturate(9) hue-rotate(295deg)"; follow(CX, CY); }
        else spr.style.opacity = "0";
      }
      if (u >= 3.0 && !a.cried) { a.cried = true; playBuildUp(); const c = offers[i]; if (c) playCry(cryFor(c.slug), creatureVoice(c.slug, HISTORIKAL.get(c.slug)?.hearts ?? 3)); }
      if (u >= 3.8) {
        const w = (u - 3.8) / 3.0;
        const L = (g: number) => { g = Math.max(0, g); const Lr = 64 * (1 - g * g); const La = Math.PI + 0.55 + g * (1 + g) * Math.PI * 2 * 0.5; return [CX + Math.cos(La) * Lr, CY + Math.sin(La) * Lr * 1.3, g] as const; };
        for (let j = 0; j < a.px.length; j++) {
          const p = a.px[j]; const lag = (p.sp - 0.6) / 0.8;
          const burst = Math.min(1, w / 0.2), eb = burst * (2 - burst);
          const sx = CX + p.ox * 0.9 + Math.cos(p.ang) * 40 * p.sp * eb, sy = CY + p.oy * 0.9 + Math.sin(p.ang) * 40 * p.sp * eb;
          const gg = Math.max(0, (w - 0.45) / 0.55);
          const [Lx, Ly, g] = L(gg - lag * 0.3); const [Bx, By] = L(gg - lag * 0.3 - 0.02);
          const dx = Lx - Bx, dy = Ly - By, n = Math.hypot(dx, dy) || 1; const nx = -dy / n, ny = dx / n;
          const width = (1 - lag) * (1 - g * 0.6); const across = (p.ox * 0.7 + Math.cos(p.ang) * 6) * width;
          const cx = Lx + nx * across, cy = Ly + ny * across;
          const f = Math.max(0, Math.min(1, (w - 0.2) / 0.25)), ef = f * f * (3 - 2 * f);
          const X = sx + (cx - sx) * ef + Math.sin(t * 6 + p.ph) * 1.5, Y = sy + (cy - sy) * ef + Math.cos(t * 5 + p.ph) * 1.5;
          const on = Math.sin(t * 26 + p.ph) > -0.3 + (w > 0.45 ? lag * 0.6 : 0);
          if (w < 1 && on) { g2.fillStyle = j % 6 === 0 ? "#f7b8dc" : "#ffffff"; const sz = w > 0.45 && (lag > 0.6 || g > 0.8) ? 2 : 3; g2.fillRect(Math.round(X), Math.round(Y), sz, sz); }
        }
        if (w >= 1) {
          // Done: the next one, or the result.
          const r = a.done; anim.current = null; setLine(null);
          if (r && r.ok && r.done) {
            const h = HISTORIKAL.get(r.slug);
            const rolled = r.rolled && h?.rnd ? (r.rolled as Element) : null;
            const types = h ? (rolled ? [...new Set([rolled, ...h.types.slice(1)])] : h.types) : [];
            setGot({ item: r.item, slug: r.slug, name: h?.name ?? r.name, types, rarity: h?.rarity ?? "uncommon", evolved: r.evolved });
            setStage("result"); window.setTimeout(playFanfare, 500);
          } else { setI((k) => k + 1); setStage("offer"); }
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  // NO: the first one just closes; later ones ask, because the others are already gone.
  const no = () => { if (fed === 0) onClose(); else setStage("abandon"); };
  const abandon = async () => { await abandonBlend(); onDone(null); };

  const bub = line && stage === "going" && shown > 0 ? line.words.slice(0, shown).join(" ") : null;
  const sprite = cur ? <Creature slug={cur.slug} el={cur.types[0]} size={64} /> : null;

  return (
    <BodyPortal>
      <div role="dialog" aria-label="Mana Blend" className="bl-scene">
        <div ref={scene} className="bl-stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <Stars />
          <div className="bl-portal" style={{ backgroundImage: `url(/blend/v${frame}.png)` }} aria-hidden />
          <canvas ref={dust} width={W} height={H} className="bl-dust" aria-hidden />
          {stage === "result" && got ? <div className="bl-flash" style={{ "--rc": RARITY_COLOR[got.rarity] } as React.CSSProperties} aria-hidden /> : null}

          <div className="px bl-title">{stage === "result" ? (got?.evolved ? "IT EVOLVED!" : "BLENDED!") : "WILL IT BLEND?"}</div>
          {stage === "offer" || stage === "going" ? <div className="px bl-count">{fed} OF 4 IN THE VOID</div> : null}

          {/* The one on offer, or the one going in. */}
          {cur && (stage === "offer" || stage === "going" || stage === "abandon") ? (
            <div key={`${cur.id}-${stage === "going" ? "going" : "offer"}`} id="bl-sprite" className={`bl-sprite${drag ? " is-held" : ""}`} {...handlers}
              style={stage === "going" ? undefined : { transform: `translate(${W / 2 + (drag?.x ?? 0)}px, ${H - 120 + (drag?.y ?? 0)}px)`, opacity: 1, filter: "none", cursor: stage === "offer" ? "grab" : "default", touchAction: "none" }}>
              {sprite}
            </div>
          ) : null}
          {bub ? <div className="px bl-bubble" id="bl-bubble">{bub}</div> : null}

          {stage === "offer" && cur ? (
            <>
              <button type="button" className="px ask-hint ask-yes bl-yes" onClick={() => void go()}><b>YES!</b><span>INTO</span><span style={{ marginTop: 0 }}>THE VOID!</span></button>
              <button type="button" className="px ask-hint ask-no bl-no" onClick={no}><b>NO!</b><span>TAKE IT</span><span style={{ marginTop: 0 }}>BACK!</span></button>
              <div className="px bl-hint">DRAG IT UP INTO THE VOID</div>
            </>
          ) : null}

          {stage === "result" && got ? (
            <>
              <div className="bl-rise"><Creature slug={got.slug} el={got.types[0]} size={128} /></div>
              <div className="px bl-got" style={{ color: RARITY_COLOR[got.rarity] }}>{up(got.name)}</div>
              <div className="px bl-sub">{up(RARITY_NAME[got.rarity])} · JOINS YOUR HISTORIKALS</div>
              <button type="button" className="px bl-done" onClick={() => onDone({ item: got.item, slug: got.slug, name: got.name, types: got.types, rarity: got.rarity })}>DONE</button>
            </>
          ) : null}

          {stage === "confirm" || stage === "abandon" || stage === "error" ? (
            <div className="bl-ask" onClick={(e) => e.stopPropagation()}>
              <div className="bl-ask-box">
                <span className="px crystr-text" style={{ fontSize: 13, letterSpacing: ".06em", textAlign: "center" }}>{stage === "error" ? "NOT THIS TIME" : "ARE YOU SURE?"}</span>
                <span className="px" style={{ fontSize: 9.5, lineHeight: 1.8, color: "#fff", letterSpacing: ".03em", textAlign: "center" }}>
                  {stage === "confirm" ? `These four ${RARITY_NAME[cur?.rarity ?? "common"]}s go into the void for good. One ${RARITY_NAME[cur?.rarity === "rare" ? "epic" : cur?.rarity === "uncommon" ? "rare" : "uncommon"]} comes out, of the types that go in.`
                    : stage === "abandon" ? "Your other sacrifices will have meant nothing." : err}
                </span>
                {stage === "error" ? (
                  <button type="button" className="px bl-btn" onClick={() => (fed ? onDone(null) : onClose())}>OK</button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="px bl-btn is-yes" onClick={() => (stage === "confirm" ? setStage("offer") : void abandon())}>YES, I&apos;M SURE</button>
                    <button type="button" className="px bl-btn" onClick={() => (stage === "confirm" ? onClose() : setStage("offer"))}>NO</button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </BodyPortal>
  );
}
