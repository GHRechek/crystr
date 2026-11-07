"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Rays, playBuildUp, playClick, playFanfare, playLidOpen } from "@/components/ask-scene";
import { Creature, Stats, type HK } from "@/components/encounter";
import { RARITY_COLOR } from "@/lib/historikals";

/** Opening your draws, a chest at a time. FIND ONE! opens a normal draw on the blue chest; SUMMON ONE! a
 *  main draw on the gold one. Turn the key (drag it to the chest, or tap it) and the chest bursts in the
 *  creature's rarity colour as it rises out. While draws are left the key comes back for the next one, and
 *  what you've found sits in a row at the top. */
export type DrawKind = "normal" | "main";

const THEME: Record<DrawKind, { title: string; bg: number[]; ray: number[]; shut: string; open: string; key: string; hint: string; btn: string }> = {
  normal: { title: "FIND ONE!", bg: [52, 94, 200], ray: [196, 44, 118], shut: "/ask/chest-closed-blue.png", open: "/ask/chest-open-blue.png", key: "/ask/key.png", hint: "#8fa2ff", btn: "#3a64cc" },
  main: { title: "SUMMON ONE!", bg: [90, 31, 110], ray: [176, 124, 24], shut: "/ask/chest-closed-gold.png", open: "/ask/chest-open-gold.png", key: "/ask/key-gold.png", hint: "#ffe08a", btn: "#c98a16" },
};
const RAY_CY = 0.38;
const RIM = 21 * 5;

type Drawn = { hk: HK; normal: number; main: number };

/** Opening one in the database: the creature and the draws left of each kind. */
async function drawFromDb(kind: DrawKind): Promise<{ ok: boolean; code?: string } & Partial<Drawn>> {
  const { data } = await createClient().rpc("cr_draw", { p_kind: kind });
  return (data as ({ ok: boolean; code?: string } & Partial<Drawn>) | null) ?? { ok: false };
}

export function DrawScene({ kind, count, onClose, drawWith = drawFromDb }: { kind: DrawKind; count: number; onClose: () => void; /** For trying it out without the database. */ drawWith?: typeof drawFromDb }) {
  const t = THEME[kind];
  const [left, setLeft] = useState(count);
  const [state, setState] = useState<"idle" | "unlocking" | "open">("idle");
  const [round, setRound] = useState(0);
  const [got, setGot] = useState<HK | null>(null);
  const [found, setFound] = useState<HK[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const chestRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Promise<Drawn | null> | null>(null);

  // Turn the key: the draw is asked for at once, and the lid opens once the build-up is done.
  const turn = () => {
    if (state !== "idle" && state !== "open") return;
    if (left <= 0) return;
    if (got) setFound((f) => [...f, got]);
    setGot(null);
    setDrag(null);
    setProblem(null);
    setRound((r) => r + 1);
    setState("unlocking");
    playClick();
    window.setTimeout(playBuildUp, 140);
    pending.current = (async () => {
      const r = await drawWith(kind);
      if (!r?.ok || !r.hk) { setProblem(r?.code === "none" ? "No draws left." : "That didn't open. Try again."); return null; }
      return { hk: r.hk, normal: r.normal ?? 0, main: r.main ?? 0 };
    })();
  };

  useEffect(() => {
    if (state !== "unlocking") return;
    let live = true;
    const began = Date.now();
    (async () => {
      const d = await pending.current;
      if (!live) return;
      if (!d) { setState("idle"); return; }
      // A legendary keeps you waiting a little longer.
      const wait = Math.max(0, (kind === "main" ? 2400 : 1850) + (d.hk.rarity === "legendary" ? 1200 : 0) - (Date.now() - began));
      window.setTimeout(() => {
        if (!live) return;
        setGot(d.hk);
        setLeft(kind === "main" ? d.main : d.normal);
        setState("open");
        playLidOpen();
        if (d.hk.rarity === "legendary" || d.hk.rarity === "rare") window.setTimeout(playFanfare, 220);
      }, wait);
    })();
    return () => { live = false; };
  }, [state, kind]);

  // How far it rises: from the chest's mouth to where the rays meet.
  useLayoutEffect(() => {
    if (state !== "open") return;
    const b = popRef.current, sc = sceneRef.current;
    if (!b || !sc) return;
    const r = b.getBoundingClientRect(), box = sc.getBoundingClientRect();
    b.style.setProperty("--rise", `${Math.round(box.top + box.height * RAY_CY - (r.top + r.height / 2))}px`);
  }, [state, round]);

  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, px: 0, py: 0 };
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const up = (e: React.PointerEvent) => {
    if (!start.current) return;
    const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y);
    start.current = null;
    const box = chestRef.current?.getBoundingClientRect();
    // Dropped on the chest, or just tapped: turn it.
    if (moved < 8 || (box && e.clientX > box.left && e.clientX < box.right && e.clientY > box.top && e.clientY < box.bottom)) { turn(); return; }
    setDrag(null);
  };

  const colour = got ? RARITY_COLOR[got.rarity] : "#fff";
  const keyReady = left > 0 && (state === "idle" || state === "open");

  return (
    <div ref={sceneRef} role="dialog" aria-label={t.title} className="ask-scene dr-scene">
      <Rays bg={t.bg} ray={t.ray} />
      <div className={`ask-dim${state === "unlocking" ? " is-on" : state === "open" ? " is-after" : ""}`} aria-hidden />

      <div className="dr-top">
        <div className="px dr-title" style={{ color: t.hint }}>{t.title}</div>
        <div className="px dr-count">{left} {left === 1 ? "DRAW" : "DRAWS"} LEFT</div>
        {found.length ? (
          <div className="dr-found" aria-label="Found so far">
            {found.map((h, i) => <Creature key={i} slug={h.slug} size={34} />)}
          </div>
        ) : null}
      </div>

      <div className="ask-stage">
        <div ref={chestRef} key={round}>
          <div style={{ width: 230, height: 195, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", zIndex: 2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-shut" src={t.shut} alt="" width={230} height={165} draggable={false} style={{ display: state === "open" ? "none" : "block", imageRendering: "pixelated", animation: state === "idle" ? undefined : "none" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-drop" src={t.open} alt="" width={225} height={195} draggable={false} style={{ display: state === "open" ? "block" : "none", imageRendering: "pixelated" }} />
            {state === "open" && got ? (
              <>
                <div className="dr-burst" style={{ "--rc": colour } as React.CSSProperties} aria-hidden />
                <div ref={popRef} className="dr-pop" style={{ "--rc": colour } as React.CSSProperties}>
                  <Creature slug={got.slug} size={96} />
                </div>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-drop" src={t.open} alt="" width={225} height={195} draggable={false} style={{ display: state === "open" ? "block" : "none", position: "absolute", left: 2, bottom: 0, zIndex: 2, clipPath: `inset(${RIM}px 0 0 0)`, imageRendering: "pixelated", pointerEvents: "none" }} />
          </div>
        </div>
      </div>

      <div className="ask-bottom dr-bottom">
        {state === "open" && got ? (
          <div className="px dr-result" aria-live="polite">
            <span className="dr-name" style={{ color: colour }}>{got.name.toUpperCase()}</span>
            <span className="dr-sub"><span style={{ color: colour }}>{got.rarity.toUpperCase()}</span><Stats h={got} k={2} /></span>
          </div>
        ) : null}
        {problem ? <div className="px dr-problem">{problem}</div> : null}
        {keyReady ? (
          <>
            <div
              className={`ask-key dr-key${drag ? " is-held" : ""}${state === "open" ? " is-again" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`The key. Drag it to the chest, or tap it, to open a draw. ${left} left.`}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={() => { start.current = null; setDrag(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(); } }}
              style={{ transform: drag ? `translate(${drag.x}px, ${drag.y}px)` : undefined, cursor: "grab", touchAction: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.key} alt="" width={59} height={108} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />
            </div>
            <div className="px dr-hint" style={{ color: t.hint }} aria-hidden>{state === "open" ? "AGAIN!" : "TURN THE KEY!"}</div>
          </>
        ) : null}
        {state !== "unlocking" ? (
          <button type="button" className="px dr-close" style={{ background: state === "open" && !keyReady ? t.btn : undefined }} onClick={onClose}>{state === "open" && !keyReady ? "DONE" : "CLOSE"}</button>
        ) : null}
      </div>
    </div>
  );
}
